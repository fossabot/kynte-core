const Discord = require("discord.js"), express = require("express"), config = require("./config.json"), http = require('http'), app = require('express')(), port = 2459, fetch = require('node-fetch');
let apiInfo = {};

const manager = new Discord.ShardingManager("./app.js", { totalShards: 5, respawn: true, token: config.token })

manager.spawn();
manager.on("launch", async shard => {
    console.log("Shard " + shard.id + " starting.")
})

app.get("/", (request, response) => { response.redirect(301, "https://www.youtube.com/watch?v=dQw4w9WgXcQ") });

app.get("/ping", (request, response) => { response.send("OK") })

app.get("/info", async (request, response) => {
	let shards = await getShards()
	let guilds = await manager.fetchClientValues('guilds.size').then(res => res.reduce((prev, val) => prev + val, 0))
	let users = await manager.fetchClientValues('users.size').then(res => res.reduce((prev, val) => prev + val, 0))
  	response.json({
		"guilds": guilds,
		"users": users,
    	"shardcount": manager.totalShards,
	  	shards
  	})
})


async function getShards() {
	let SHARD_0 = await fetch('http://localhost:2460/info').then(res => res.json()).catch(e => "OFFLINE");
	let SHARD_1 = await fetch('http://localhost:2461/info').then(res => res.json()).catch(e => "OFFLINE");
	let SHARD_2 = await fetch('http://localhost:2462/info').then(res => res.json()).catch(e => "OFFLINE");
	let SHARD_3 = await fetch('http://localhost:2463/info').then(res => res.json()).catch(e => "OFFLINE");
	let SHARD_4 = await fetch('http://localhost:2464/info').then(res => res.json()).catch(e => "OFFLINE");
	
	let all = {
		SHARD_0,
		SHARD_1,
		SHARD_2,
		SHARD_3,
		SHARD_4
	}
	return all;
}

http.createServer(app).listen(port)