(function (global) {
  "use strict";

  var client = null;
  var user = null;
  var profile = null;
  var configured = false;
  var saveTimer = null;
  var saving = false;
  var pendingState = null;
  var sessionTask = null;
  var callbacks = {};
  var starterReps = [];
  var starterCategoryById = {};
  var starterRepsVersion = 1;

  function normalizeSupabaseUrl(url) {
    var value = String(url || "").trim();
    value = value.replace(/^supabaseUrl:\s*/i, "");
    value = value.replace(/^["']|["']$/g, "").trim();
    value = value.replace(/^https:\/(?!\/)/i, "https://");
    if (value && !/^https?:\/\//i.test(value)) {
      value = "https://" + value.replace(/^\/+/, "");
    }
    return value;
  }

  function normalizeSupabaseKey(key) {
    var value = String(key || "").trim();
    value = value.replace(/^supabaseAnonKey:\s*/i, "");
    return value.replace(/^["']|["']$/g, "").trim();
  }

  function isConfigured() {
    return configured;
  }

  function isReady() {
    return configured && !!user;
  }

  function getUser() {
    return user;
  }

  function getProfile() {
    return profile;
  }

  function newId(prefix) {
    if (global.crypto && crypto.randomUUID) return prefix + crypto.randomUUID();
    return prefix + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
  }

  async function loadProfile(userId) {
    var res = await client.from("profiles").select("id, display_name").eq("id", userId).maybeSingle();
    if (res.error) throw res.error;
    profile = res.data;
    return profile;
  }

  function repFromRows(repRow, lines) {
    var openers = [];
    var followups = [];
    (lines || [])
      .filter(function (line) { return line.rep_id === repRow.id; })
      .sort(function (a, b) { return a.sort_order - b.sort_order; })
      .forEach(function (line) {
        if (line.line_type === "opener") openers.push(line.content);
        else followups.push(line.content);
      });
    return {
      id: repRow.id,
      label: repRow.label,
      openers: openers,
      followups: followups,
      category: repRow.category || undefined
    };
  }

  async function fetchCloudState(userId) {
    var repRes = await client.from("reps").select("*").eq("user_id", userId);
    if (repRes.error) throw repRes.error;

    var reps = repRes.data || [];
    if (!reps.length) return null;

    var repIds = reps.map(function (r) { return r.id; });
    var lineRes = await client.from("rep_lines").select("*").eq("user_id", userId).in("rep_id", repIds);
    if (lineRes.error) throw lineRes.error;

    var routeRes = await client.from("routes").select("*").eq("user_id", userId);
    if (routeRes.error) throw routeRes.error;

    var routeRepRes = await client.from("route_reps").select("*").eq("user_id", userId);
    if (routeRepRes.error) throw routeRepRes.error;

    var logRes = await client.from("rep_logs").select("*").eq("user_id", userId);
    if (logRes.error) throw logRes.error;

    var completionRes = await client.from("route_completions").select("*").eq("user_id", userId);
    if (completionRes.error) throw completionRes.error;

    var lines = lineRes.data || [];
    var customStops = reps.map(function (rep) { return repFromRows(rep, lines); });
    var seededRepIds = reps.filter(function (r) { return !!r.starter_id; }).map(function (r) { return r.starter_id; });

    var routeRepsByRoute = {};
    (routeRepRes.data || []).forEach(function (row) {
      if (!routeRepsByRoute[row.route_id]) routeRepsByRoute[row.route_id] = [];
      routeRepsByRoute[row.route_id].push({ rep_id: row.rep_id, sort_order: row.sort_order });
    });

    var customRoutes = (routeRes.data || []).map(function (route) {
      var stops = (routeRepsByRoute[route.id] || []).sort(function (a, b) { return a.sort_order - b.sort_order; });
      return {
        id: route.id,
        name: route.name,
        stopIds: stops.map(function (s) { return s.rep_id; })
      };
    });

    var today = new Date().toISOString().slice(0, 10);
    var todayReps = {};
    (logRes.data || []).forEach(function (log) {
      if (log.logged_date !== today) return;
      if (!todayReps[log.route_id]) todayReps[log.route_id] = [];
      todayReps[log.route_id].push(log.rep_id);
    });

    var weekCompletions = (completionRes.data || []).map(function (row) {
      return { routeId: row.route_id, date: row.completed_date };
    });

    return {
      customStops: customStops,
      customRoutes: customRoutes,
      todayReps: todayReps,
      weekCompletions: weekCompletions,
      seededRepIds: seededRepIds,
      starterRepsSeeded: true,
      starterRepsVersion: starterRepsVersion
    };
  }

  function buildSeedState(localState) {
    var base = localState || {};
    var stops = (base.customStops && base.customStops.length)
      ? base.customStops.slice()
      : starterReps.map(function (rep) {
          return {
            id: rep.id,
            label: rep.label,
            openers: rep.openers.slice(),
            followups: rep.followups.slice()
          };
        });

    var seededRepIds = starterReps.map(function (r) { return r.id; });
    return {
      customStops: stops,
      customRoutes: (base.customRoutes || []).slice(),
      todayReps: base.todayReps || {},
      weekCompletions: base.weekCompletions || [],
      seededRepIds: seededRepIds,
      starterRepsSeeded: true,
      starterRepsVersion: starterRepsVersion
    };
  }

  async function seedCloudState(userId, localState) {
    var seed = buildSeedState(localState);
    await pushStateToCloud(userId, seed);
    return seed;
  }

  async function pushStateToCloud(userId, state) {
    var reps = state.customStops || [];
    var routes = state.customRoutes || [];

    var repRows = reps.map(function (stop) {
      var starterId = (state.seededRepIds || []).indexOf(stop.id) >= 0 ? stop.id : null;
      var category = starterId ? (starterCategoryById[starterId] || null) : (stop.category || null);
      return {
        id: stop.id,
        user_id: userId,
        label: stop.label,
        category: category,
        starter_id: starterId,
        updated_at: new Date().toISOString()
      };
    });

    var lineRows = [];
    reps.forEach(function (stop) {
      (stop.openers || []).forEach(function (text, i) {
        lineRows.push({
          rep_id: stop.id,
          user_id: userId,
          line_type: "opener",
          content: text,
          sort_order: i
        });
      });
      (stop.followups || []).forEach(function (text, i) {
        lineRows.push({
          rep_id: stop.id,
          user_id: userId,
          line_type: "followup",
          content: text,
          sort_order: i
        });
      });
    });

    var routeRows = routes.map(function (route) {
      return {
        id: route.id,
        user_id: userId,
        name: route.name,
        updated_at: new Date().toISOString()
      };
    });

    var routeRepRows = [];
    routes.forEach(function (route) {
      (route.stopIds || []).forEach(function (repId, i) {
        routeRepRows.push({
          route_id: route.id,
          rep_id: repId,
          user_id: userId,
          sort_order: i
        });
      });
    });

    var logRows = [];
    Object.keys(state.todayReps || {}).forEach(function (routeId) {
      (state.todayReps[routeId] || []).forEach(function (repId) {
        logRows.push({
          user_id: userId,
          route_id: routeId,
          rep_id: repId,
          logged_date: state.today || new Date().toISOString().slice(0, 10)
        });
      });
    });

    var completionRows = (state.weekCompletions || []).map(function (entry) {
      return {
        user_id: userId,
        route_id: entry.routeId,
        completed_date: entry.date
      };
    });

    var existingRepRes = await client.from("reps").select("id").eq("user_id", userId);
    if (existingRepRes.error) throw existingRepRes.error;
    var existingRepIds = (existingRepRes.data || []).map(function (r) { return r.id; });
    var nextRepIds = repRows.map(function (r) { return r.id; });
    var deleteRepIds = existingRepIds.filter(function (id) { return nextRepIds.indexOf(id) < 0; });
    if (deleteRepIds.length) {
      var delReps = await client.from("reps").delete().eq("user_id", userId).in("id", deleteRepIds);
      if (delReps.error) throw delReps.error;
    }

    if (repRows.length) {
      var upsertReps = await client.from("reps").upsert(repRows, { onConflict: "id" });
      if (upsertReps.error) throw upsertReps.error;
    }

    var delLines = await client.from("rep_lines").delete().eq("user_id", userId);
    if (delLines.error) throw delLines.error;
    if (lineRows.length) {
      var insLines = await client.from("rep_lines").insert(lineRows);
      if (insLines.error) throw insLines.error;
    }

    var existingRouteRes = await client.from("routes").select("id").eq("user_id", userId);
    if (existingRouteRes.error) throw existingRouteRes.error;
    var existingRouteIds = (existingRouteRes.data || []).map(function (r) { return r.id; });
    var nextRouteIds = routeRows.map(function (r) { return r.id; });
    var deleteRouteIds = existingRouteIds.filter(function (id) { return nextRouteIds.indexOf(id) < 0; });
    if (deleteRouteIds.length) {
      var delRoutes = await client.from("routes").delete().eq("user_id", userId).in("id", deleteRouteIds);
      if (delRoutes.error) throw delRoutes.error;
    }

    if (routeRows.length) {
      var upsertRoutes = await client.from("routes").upsert(routeRows, { onConflict: "id" });
      if (upsertRoutes.error) throw upsertRoutes.error;
    }

    var delRouteReps = await client.from("route_reps").delete().eq("user_id", userId);
    if (delRouteReps.error) throw delRouteReps.error;
    if (routeRepRows.length) {
      var insRouteReps = await client.from("route_reps").insert(routeRepRows);
      if (insRouteReps.error) throw insRouteReps.error;
    }

    var delLogs = await client.from("rep_logs").delete().eq("user_id", userId);
    if (delLogs.error) throw delLogs.error;
    if (logRows.length) {
      var insLogs = await client.from("rep_logs").insert(logRows);
      if (insLogs.error) throw insLogs.error;
    }

    var delCompletions = await client.from("route_completions").delete().eq("user_id", userId);
    if (delCompletions.error) throw delCompletions.error;
    if (completionRows.length) {
      var insCompletions = await client.from("route_completions").insert(completionRows);
      if (insCompletions.error) throw insCompletions.error;
    }
  }

  async function flushSave() {
    if (!isReady() || !pendingState) return;
    var snapshot = pendingState;
    pendingState = null;
    saving = true;
    try {
      await pushStateToCloud(user.id, snapshot);
      if (callbacks.onSync) callbacks.onSync("saved");
    } catch (err) {
      console.error("Cloud save failed", err);
      pendingState = snapshot;
      if (callbacks.onSync) callbacks.onSync("error", err);
    } finally {
      saving = false;
      if (pendingState) flushSave();
    }
  }

  function queueSave(state) {
    if (!isReady()) return;
    pendingState = state;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushSave, 700);
  }

  async function signUp(email, password) {
    var res = await client.auth.signUp({
      email: email,
      password: password
    });
    if (res.error) throw res.error;
    if (res.data.user && !res.data.session) {
      return { needsConfirmation: true, user: res.data.user };
    }
    return { needsConfirmation: false, user: res.data.user, session: res.data.session };
  }

  async function signIn(email, password) {
    var res = await client.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data;
  }

  async function signOut() {
    var res = await client.auth.signOut();
    if (res.error) throw res.error;
  }

  async function updateDisplayName(name) {
    if (!isReady()) throw new Error("Not signed in");
    var trimmed = (name || "").trim();
    if (!trimmed) throw new Error("Name required");
    var res = await client.from("profiles").update({ display_name: trimmed }).eq("id", user.id);
    if (res.error) throw res.error;
    profile = { id: user.id, display_name: trimmed };
    var metaRes = await client.auth.updateUser({ data: { display_name: trimmed } });
    if (metaRes.error) throw metaRes.error;
    return profile;
  }

  async function handleSession(session, localStateGetter) {
    if (sessionTask) {
      await sessionTask;
      return;
    }

    sessionTask = (async function () {
      user = session ? session.user : null;
      profile = null;

      if (!user) {
        if (callbacks.onAuthStateChange) callbacks.onAuthStateChange(null, null);
        return;
      }

      await loadProfile(user.id);
      var cloudState = await fetchCloudState(user.id);
      if (!cloudState) {
        cloudState = await seedCloudState(user.id, localStateGetter ? localStateGetter() : null);
      }
      if (callbacks.onAuthStateChange) callbacks.onAuthStateChange(user, cloudState);
    })();

    try {
      await sessionTask;
    } finally {
      sessionTask = null;
    }
  }

  function init(options) {
    callbacks = options || {};
    starterReps = options.starterReps || [];
    starterCategoryById = options.starterCategoryById || {};
    starterRepsVersion = options.starterRepsVersion || 1;

    var config = global.APP_CONFIG || {};
    config = {
      supabaseUrl: normalizeSupabaseUrl(config.supabaseUrl),
      supabaseAnonKey: normalizeSupabaseKey(config.supabaseAnonKey)
    };
    global.APP_CONFIG = config;

    if (!config.supabaseUrl || !config.supabaseAnonKey || config.supabaseUrl.indexOf("YOUR_PROJECT") >= 0) {
      configured = false;
      if (callbacks.onAuthStateChange) callbacks.onAuthStateChange(null, null);
      return Promise.resolve(false);
    }

    if (!global.supabase) {
      console.warn("Supabase JS not loaded");
      configured = false;
      return Promise.resolve(false);
    }

    client = global.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
    configured = true;

    client.auth.onAuthStateChange(function (_event, session) {
      handleSession(session, callbacks.getLocalState).catch(function (err) {
        console.error("Auth state handling failed", err);
        if (callbacks.onSync) callbacks.onSync("error", err);
      });
    });

    return client.auth.getSession().then(function (result) {
      if (result.error) throw result.error;
      return handleSession(result.data.session, callbacks.getLocalState).then(function () {
        return true;
      });
    });
  }

  global.SocialRepsCloud = {
    init: init,
    isConfigured: isConfigured,
    isReady: isReady,
    getUser: getUser,
    getProfile: getProfile,
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    updateDisplayName: updateDisplayName,
    queueSave: queueSave,
    newId: newId
  };
})(window);
