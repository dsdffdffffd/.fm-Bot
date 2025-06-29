(async () => {
  const { Client } = await import("revolt.js");
  const fs = require("fs");
  const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

  const client = new Client();
  const prefix = ".";

  let users = fs.existsSync("users.json") ? JSON.parse(fs.readFileSync("users.json")) : {};

  client.on("ready", () => {
    console.log(`🎧 Logged in as ${client.user.username} (.fmR)`);
  });

  client.on("messageCreate", async (message) => {
    if (!message.content.startsWith(prefix)) return;

    const [cmd, ...args] = message.content.slice(prefix.length).split(" ");
    const lfm = users[message.author._id];
    const apiKey = "a3a27f8de7e87d2ebcf77b8cf305da1e";

    if (cmd === "login") {
      const username = args[0];
      if (!username) return message.reply("Usage: `.login your_lastfm_username`");
      users[message.author._id] = username;
      fs.writeFileSync("users.json", JSON.stringify(users, null, 2));
      return message.reply(`🎧 Linked your account to **${username}**!`);
    }

    if (!lfm && cmd !== "login" && cmd !== "help") {
      return message.reply("❗ Use `.login your_lastfm_username` first.");
    }

    if (cmd === "np" || cmd === "nowplaying") {
      const res = await fetch(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${lfm}&api_key=${apiKey}&format=json&limit=1`);
      const json = await res.json();
      const track = json.recenttracks.track?.[0];
      if (!track) return message.reply("⚠️ No recent track found.");
      return message.reply(`🎶 **${lfm}** is listening to **${track.name}** by **${track.artist["#text"]}**`);
    }

    if (cmd === "topartists") {
      const res = await fetch(`http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${lfm}&api_key=${apiKey}&format=json&limit=5`);
      const json = await res.json();
      const list = json.topartists?.artist?.map((a, i) => `${i + 1}. ${a.name} (${a.playcount} plays)`).join("\n");
      return message.reply(`🎤 **Top Artists for ${lfm}**\n${list}`);
    }

    if (cmd === "toptracks") {
      const res = await fetch(`http://ws.audioscrobbler.com/2.0/?method=user.gettoptracks&user=${lfm}&api_key=${apiKey}&format=json&limit=5`);
      const json = await res.json();
      const list = json.toptracks?.track?.map((t, i) => `${i + 1}. ${t.name} by ${t.artist.name} (${t.playcount} plays)`).join("\n");
      return message.reply(`🎵 **Top Tracks for ${lfm}**\n${list}`);
    }

    if (cmd === "albums") {
      const res = await fetch(`http://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${lfm}&api_key=${apiKey}&format=json&limit=5`);
      const json = await res.json();
      const list = json.topalbums?.album?.map((a, i) => `${i + 1}. ${a.name} by ${a.artist.name} (${a.playcount} plays)`).join("\n");
      return message.reply(`💿 **Top Albums for ${lfm}**\n${list}`);
    }

    if (cmd === "recent") {
      const res = await fetch(`http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${lfm}&api_key=${apiKey}&format=json&limit=5`);
      const json = await res.json();
      const list = json.recenttracks?.track?.map((t, i) => `${i + 1}. ${t.name} by ${t.artist["#text"]}`).join("\n");
      return message.reply(`📜 **Recent Tracks for ${lfm}**\n${list}`);
    }

    if (cmd === "userinfo") {
      const res = await fetch(`http://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${lfm}&api_key=${apiKey}&format=json`);
      const json = await res.json();
      const user = json.user;
      const text = `
👤 **User Info for ${user.name}**
• Playcount: ${user.playcount}
• Registered: ${new Date(user.registered["#text"] * 1000).toLocaleDateString()}
• Country: ${user.country || "N/A"}
• Profile: ${user.url}
      `;
      return message.reply(text.trim());
    }

    if (cmd === "compare") {
      const targetMention = args[0]?.replace(/[<@>]/g, "");
      if (!targetMention || !users[targetMention]) return message.reply("❗ Mention a user who linked their Last.fm.");

      const user1 = lfm;
      const user2 = users[targetMention];

      const [res1, res2] = await Promise.all([
        fetch(`http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${user1}&api_key=${apiKey}&format=json&limit=20`).then(r => r.json()),
        fetch(`http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${user2}&api_key=${apiKey}&format=json&limit=20`).then(r => r.json())
      ]);

      const a1 = res1.topartists?.artist.map(a => a.name) || [];
      const a2 = res2.topartists?.artist.map(a => a.name) || [];
      const common = a1.filter(artist => a2.includes(artist));

      return message.reply(`🔁 **Compare: ${user1} & ${user2}**\nShared artists (${common.length}):\n${common.join(", ") || "None"}`);
    }

    if (cmd === "chart") {
      const res = await fetch(`http://ws.audioscrobbler.com/2.0/?method=user.gettopartists&user=${lfm}&api_key=${apiKey}&format=json&limit=9`);
      const json = await res.json();
      const grid = json.topartists?.artist?.map((a, i) => `${a.name.slice(0, 15)}`).slice(0, 9);

      if (grid.length < 9) return message.reply("⚠️ Need more top artists to make a full chart.");

      const rows = [];
      for (let i = 0; i < 9; i += 3) {
        rows.push(grid.slice(i, i + 3).map(name => name.padEnd(16)).join(""));
      }

      return message.reply(`📊 **Top Artist Chart for ${lfm}**\n\`\`\`\n${rows.join("\n")}\n\`\`\``);
    }

    if (cmd === "help") {
      return message.reply(`
🎧 **.fmR Help**
\`.login <username>\` — Link Last.fm  
\`.np\` — Now Playing  
\`.topartists\` — Top Artists  
\`.toptracks\` — Top Tracks  
\`.albums\` — Top Albums  
\`.recent\` — Recent Tracks  
\`.userinfo\` — Profile Info  
\`.compare <@user>\` — Compare top artists  
\`.chart\` — Grid of top 9 artists
`.trim());
    }
  });

  client.loginBot("mL5Ntiy3QqhVCxAbtUKzOC_0yqSVzVB8YDYTTMEuLQTsmGzizg-ihV2cRjVoCChB", {
    presence: {
      status: "DoNotDisturb",
      presence: "Focus"
    }
  });
})();