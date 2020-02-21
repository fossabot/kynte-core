const Discord = require("discord.js"), fs = require("fs"), config = require("./config.json"), constants = require("./constants"), http = require('http'), app = require('express')(), BLAPI = require("blapi");

const client = new Discord.Client({ disableEveryone: true }), shId = client.shard ? "Shard " + client.shard.id + ": " : "", port = 2460 + client.shard.id;
const prefix = config.prefix;


app.get("/", (request, response) => { response.redirect(301, "https://www.youtube.com/watch?v=dQw4w9WgXcQ") });

app.get("/ping", (request, response) => { response.send("OK") })

app.get("/info", async (request, response) => {
  let guilds = await client.shard.fetchClientValues('guilds.size').then(res => res.reduce((prev, val) => prev + val, 0)), users = await client.shard.fetchClientValues('users.size').then(res => res.reduce((prev, val) => prev + val, 0)), shards = client.shard.count, shardguilds = client.guilds.size, shardusers = client.users.size, sharduptime = msToTime(client.uptime), shardping = Math.round(client.ping), shardid = client.shard.id;
  response.json({
    "guilds": guilds,
    "users": users,
    "shards": shards,
    "shard": {
      "id": shardid,
      "guilds": shardguilds,
      "users": shardusers,
      "uptime": sharduptime,
      "ping": shardping
    }
  })
})

client.on("ready", async () => {
  console.log(shId + "Ready as " + client.user.tag);
  client.user.setPresence({ status: "idle", game: { name: "the loading screen", type: "WATCHING" }})

  updatePresence()
  client.setInterval(updatePresence, 60000)
})

async function updatePresence() {
  if (!client.guilds.size) return; // client is not ready yet, or have lost connection
  let shardid = client.shard.id + 1;
  let name = config.prefix + "help (" + await client.shard.fetchClientValues('guilds.size').then(res => res.reduce((prev, val) => prev + val, 0)) + " servers) [" + shardid + "/" + client.shard.count + "]"
  client.user.setPresence({ status: "online", game: { name, type: "WATCHING" } })
}

const commands = {}, aliases = {}
fs.readdir("./commands/", (err, files) => {
  if (err) console.error(err);
  for (let file of files) if (file.endsWith(".js")) {
    let commandFile = require("./commands/" + file), fileName = file.replace(".js", "")
    commands[fileName] = commandFile
    if (commandFile.aliases) for (let alias of commandFile.aliases) aliases[alias] = fileName
  }
})

client.on("message", async message => {
    if (!message.guild || message.author.id == client.user.id || message.author.discriminator == "0000" || message.author.bot) return;
  
    if (message.content.startsWith(prefix) || message.content.match(`^<@!?${client.user.id}> `)) {
      if (!message.member && message.author.id) try { message.member = await message.guild.fetchMember(message.author.id, true) } catch(e) {} // on bigger bots with not enough ram, not all members are loaded in. So if a member is missing, we try to load it in.
  
      let args = message.content.split(" ");
      if (args[0].match(`^<@!?${client.user.id}>`)) args.shift(); else args = message.content.slice(prefix.length).split(" ");
      const identifier = args.shift().toLowerCase(), command = aliases[identifier] || identifier
  
      const commandFile = commands[command], permissionLevel = getPermissionLevel(message.member)
      if (commandFile) {
        if (permissionLevel < commandFile.permissionRequired) return message.channel.send("❌ You don't have permission to do this!");
        if (commandFile.checkArgs(args, permissionLevel) !== true) return message.channel.send("❌ Invalid arguments! Usage is `" + prefix + command + Object.keys(commandFile.usage).map(a => " " + a).join("") + "\`, for additional help type `" + prefix + "help " + command + "`.");
        
        commandFile.run(client, message, args, config, prefix, permissionLevel, constants)
      }
    } else if (message.content.match(`^<@!?${client.user.id}>`)) {
      return message.channel.send("👋 My prefix is `" + prefix + "`, for help type `" + prefix + "help`.")
    }
})
  
let getPermissionLevel = (member) => {
    if (config.admins[0] == member.user.id) return 5;
    if (config.admins.includes(member.user.id)) return 4;
    if (member.guild.owner.id == member.id) return 3;
    if (member.hasPermission("MANAGE_GUILD")) return 2;
    if (member.hasPermission("MANAGE_MESSAGES")) return 1;
    return 0;
}

client
  .on("disconnect", dc => console.log(shId + "Disconnected:", dc))
  .on("reconnecting", () => console.log(shId + "Reconnecting..."))
  .on("resume", replayed => console.log(shId + "Resumed. [" + replayed + " events replayed]"))
  .on("error", err => console.log(shId + "Unexpected error:", err))
  .on("warn", warn => console.log(shId + "Unexpected warning:", warn))
  .login(config.token)

function msToTime(ms){
  days = Math.floor(ms / 86400000); // 24*60*60*1000
  daysms = ms % 86400000; // 24*60*60*1000
  hours = Math.floor(daysms / 3600000); // 60*60*1000
  hoursms = ms % 3600000; // 60*60*1000
  minutes = Math.floor(hoursms / 60000); // 60*1000
  minutesms = ms % 60000; // 60*1000
  sec = Math.floor(minutesms / 1000);
  
  let str = "";
  if (days) str = str + days + "d";
  if (hours) str = str + hours + "h";
  if (minutes) str = str + minutes + "m";
  if (sec) str = str + sec + "s";
  
  return str;
}

http.createServer(app).listen(port)
if (config.listKeys && Object.values(config.listKeys).length) BLAPI.handle(client, config.listKeys, 15);