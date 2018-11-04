var Discord = require('discord.js');
var logger = require('winston');
var auth = require('./auth.json');



// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(new logger.transports.Console, {
colorize: true});
logger.level = 'debug';

// Initialize Discord Bot
var bot = new Discord.Client();

//load database
var database = require('./database.json');
//const editJsonFile = require("edit-json-file");
//var file = editJsonFile(`${__dirname}/database.json`);


//variables
const trialgrounds = {ch: '471000096012500992', id: '470995797258010636'};
const dead = {ch: '471314724794007553', id: '471314654053007382'};
const ko = {ch: '472387558844923904', id: '472386665789521940'};
const pokeball = {ch: '472387649563263011', id: '472386850909192212'};

const roomIDs = ['470697467550105607', '470697567542444042', '470995249557405697', '470995314694815755', '470995366716637205', '470995454822187019', '470995489014284288', '470995513349505034', '470995635957661699', trialgrounds.id, dead.id, ko.id, pokeball.id ];
const channelIDs = ['470692760698093588', '470693771114446859', '470999759495364618', '470999797973909507', '470999834355171336', '470999874305916938', '470999912868216833', '470999989641019392', '471000051993542661'];


var channels = new Map(); //key = channel-name, value = channelID
channels.set("arcade", channelIDs[0]); 
channels.set("casino", channelIDs[1]); 
channels.set("disco", channelIDs[2]); 
channels.set("throne-room", channelIDs[3]); 
channels.set("lobby", channelIDs[4]); 
channels.set("graveyard", channelIDs[5]); 
channels.set("laboratory", channelIDs[6]); 
channels.set("arena", channelIDs[7]); 
channels.set("weeb-corner", channelIDs[8]); 


var rooms = new Map(); //key = channelIDs, value = roleIDs
rooms.set(channelIDs[0], roomIDs[0]); //arcade
rooms.set(channelIDs[1], roomIDs[1]); //casino
rooms.set(channelIDs[2], roomIDs[2]); //disco
rooms.set(channelIDs[3], roomIDs[3]); //throne-room
rooms.set(channelIDs[4], roomIDs[4]); //lobby
rooms.set(channelIDs[5], roomIDs[5]); //graveyard
rooms.set(channelIDs[6], roomIDs[6]); //laboratory
rooms.set(channelIDs[7], roomIDs[7]); //arena
rooms.set(channelIDs[8], roomIDs[8]); //weeb-corner
rooms.set(trialgrounds.ch, trialgrounds.id);
rooms.set(dead.ch, dead.id);
rooms.set(ko.ch, ko.id);
rooms.set(pokeball.ch, pokeball.id);

var roomNeighbours = new Map(); //key = roleIDs, value = neighbour roleIDs
roomNeighbours.set(roomIDs[0], [roomIDs[1]]);
roomNeighbours.set(roomIDs[1], [roomIDs[0], roomIDs[2], roomIDs[5]]);
roomNeighbours.set(roomIDs[2], [roomIDs[1], roomIDs[4]]);
roomNeighbours.set(roomIDs[3], [roomIDs[6]]);
roomNeighbours.set(roomIDs[4], [roomIDs[2], roomIDs[5], roomIDs[6], roomIDs[7]]);
roomNeighbours.set(roomIDs[5], [roomIDs[1], roomIDs[4], roomIDs[7]]);
roomNeighbours.set(roomIDs[6], [roomIDs[3], roomIDs[4], roomIDs[8]]);
roomNeighbours.set(roomIDs[7], [roomIDs[4], roomIDs[5], roomIDs[8]]);
roomNeighbours.set(roomIDs[8], [roomIDs[6], roomIDs[7]]);


var weapons = ["fists", "knife", "scissor-blade", "warhammer-of-zillyhoo", "chainsword", "money-machete", "tranquilizer-gun", "bolt-pistol", "cash-cannon", "death-note", "fluorite-octet", "pokeball"];

var magic = {
	red : false,
	green : false,
	white : false,
	blue : false,
	black : false,
	ready : function () { return this.red && this.green && this.white && this.blue && this.black; }
}

var powerLevels = new Map(); //key = items, value = power
powerLevels.set('fists', 0);
powerLevels.set('death-note', 0);
powerLevels.set('fluorite-octet', 0);
powerLevels.set('knife', 1);
powerLevels.set('scissor-blade', 2);
powerLevels.set('warhammer-of-zillyhoo', 2);
powerLevels.set('chainsword', 2);
powerLevels.set('money-machete', 2);
powerLevels.set('cash-cannon', 3);
powerLevels.set('bolt-pistol', 3);
powerLevels.set('pokeball', 3);
powerLevels.set('tranquilizer-gun', 3);

var startingItems = ['codex-astartes', 'nendoroid', 'sburb-beta', 'key', 'pearl'];
var casinoInventory = ['money-machete', 'cash-cannon', 'dollar-bill'];
var animeMerch = ['anime-pin', 'anime-poster', 'anime-tshirt', 'anime-pillow', 'anime-bluray', 'anime-figure'];
var animePile = [];
var arcadeGames = database.arcadegames;


var murders = [];
var knockouts = [];
var roomEvents = [];
var welcomeEvents = [];
var players = [];
var winners = [];
var losers = [];
var casinoDice = [];
var playing = false;
var voting = false;
var casinoOpen = false;
var arenaRewardsGiven = false;
var bossFight = false;
var boss = new Boss();



//classes
function Player(user, userID) {
	this.name = user;
	this.id = userID;
	this.inventory = ['knife'];
	this.weapon = "fists";
	this.edge = 0;
	this.coins = 0;
	this.target = '';
	this.alive = true;
	this.bleeding = false;
	this.dancing = false;
	this.distracting = false;
	this.room = roomIDs[4]; // start in lobby
	this.cds = {mine: 0, attack: 0};

	this.voted = false;
	this.votes = 0;

	this.acted = false;
	this.lastAction = "";

	this.addItem = function (item) {this.inventory.push(item);};
	this.removeItem = function (item) {
		if (this.hasItem(item)) {
			var firstInstance = this.inventory.findIndex(function(i) {return i == item;});
			this.inventory.splice(firstInstance, 1);
		}
	};
	this.hasItem = function (item) {return this.inventory.includes(item);};
	this.equip = function (item) {this.weapon = item;};
}

function Murder(victim, culprit, weapon, room) {
	this.victim = victim;
	this.culprit = culprit;
	this.room = room;
	this.weapon = weapon;
	this.description = function () {
		result = "a murder happened here! ";
		switch (this.weapon) {
			case 'fists':
				result += "<@" + this.victim + "> lies dead on the floor with several bruises on their face and strangling marks on their throat.";
			break;	
			case 'knife':
				result += "<@" + this.victim + "> lies dead on the floor with a knife in their chest.";
			break;
			case 'scissor-blade':
				result += "<@" + this.victim + "> lies dead on the floor, their head several feet away from their body. The sword scissor lies next to them."; 
			break;
			case 'warhammer-of-zillyhoo': 
				result += "<@" + this.victim + "> lies dead on the floor, their head bashed in from heavy blunt force trauma. The warhammer of zillyhoo lies next to them."; 
			break;
			case 'money-machete':
				result += "<@" + this.victim + "> lies dead on the floor, a pile of blood-soaked dollar bills covering a deep chest wound"; 	
			break;
			case 'chainsword': 
				result += "<@" + this.victim + "> lies dead on the floor with their entire torso gruesomely split open. The chainsword lies next to them."; 
			break;
			case 'bolt-pistol': 
				result += "<@" + this.victim + "> lies dead on the floor with half their face blown off. The bolt pistol lies next to them."; 
			break;
			case 'cash-cannon': 
				result += "<@" + this.victim + "> lies dead on the floor, coins littered around them and sticking out of the wounds that cover their body. The cash cannon lies next to them."; 
			break;
			case 'death-note': 
				result += "<@" + this.victim + "> lies dead on the floor with no noticeable wounds at all."; 
			break;
			case 'fluorite-octet': 
				result += "<@" + this.victim + "> lies dead on the floor with a series of wounds too bizarre to adequately describe in words. The fluorite octet lies next to them."; 
			break;
			case 'despair':
				result += "<@" + this.victim + "> lies dead on the floor. Their flesh is pitch-black and cracked and their face is contorted in agony.";
			break;
		}
		return result + "\n" + "inform the other players or go to the trial-grounds to vote for the killer.";

	};
}

function KnockOut(victim, room, time) {
	this.victim = victim;
	this.room = room;
	this.time = time;
}

function RoomEvent(room, desc, id) {
	this.room = room;
	this.description = desc;
	this.id = id;
}

function Boss() {
	this.hp = 8;
	this.lastAction = "";
	this.single = function (tid) {

			var result = "";
			players.forEach( function (p) {
				if (p.id == tid) {
					if (p.lastAction == "defend") {
						result += "The Negaturtle strikes at " + p.name + ", but they successfully defend.";
					} else {
						result += "The Negaturtle strikes at " + p.name + " and kills them. It feeds on their soul and regenerates 2 HP.";
						this.hp += 2;
						if (this.hp > 8) {this.hp = 8};
						p.alive = false;
						changeRoom(p.room, dead.id, dead.ch, p.id);
					}
					
				}
			});


						
			sendMessage({
				to: channels.get("graveyard"),
				message: result
			});
			this.lastAction = "single";
		};

	this.charge = function () {

			sendMessage({
				to: channels.get("graveyard"),
				message: "The Negaturtle charges up its devastating shadow breath."
			});
			this.lastAction = "charge";
		};

	this.aoe = function () {

			var result = "The Negaturtle unleashes its stored energy and bathes the whole room in shadow flames.\n";
			var restore = 0;
			players.forEach( function (p) {
				if (p.alive) {
					if (p.lastAction == "defend") {
						result += p.name + " successfully defends.\n";
					} else {
						result += p.name + " is incinerated. The Negaturtle feeds on their soul and regenerates 2 HP.\n";
						this.hp += 2;
						if (this.hp > 8) {this.hp = 8};
						p.alive = false;
						changeRoom(p.room, dead.id, dead.ch, p.id);
					}
				}
			});

			sendMessage({
				to: channels.get("graveyard"),
				message: result
			});
			this.lastAction = "aoe";
		};

	this.act = function () {
		if (this.lastAction == "") {
			this.charge();
		} else if (this.lastAction == "charge") {
			this.aoe();
		} else {
			var i;
			for (i = 0; i < 1000; i++) {
				players.sort(randomSort);
			}
			var target = players.find( function (p) {return p.alive;}).id;
			if (this.lastAction == "aoe") {
				this.single(target);
			} else if (Math.random() < 0.5) {
				this.single(target);
			} else {
				this.charge();
			}

		}
		var result;
		setTimeout(function() {
			if (players.some(function(p) {return p.alive;})) {
				result = " Your turn!";
			} else {
				result = "\n\n" + database["boss-fight"].defeat;
				bossFight = false;
			}
			sendMessage({
				to: channels.get("graveyard"),
				message: result
			});
		}, 2000);
		players.forEach(function(p) {
			p.acted = false;
		});
	};
}	


//functions
function sendMessage(msgObj) {
		var ch;
		var message = msgObj.message;

		if (bot.channels.has(msgObj.to)) {
			ch = bot.channels.get(msgObj.to);
			ch.send(message);
		} else if (bot.users.has(msgObj.to)) {
			ch = bot.users.get(msgObj.to);
			ch.send(message);
		}
}


function checkIfPlayer(user) {
	return players.some(function(value) {return value.id == user;});
}

function randomSort(a, b) {
	return 0.5 - Math.random();

}

function changeRoom(from, to, chID, uID) {
	if(from == to) {return;}

	var guild = bot.channels.get(chID).guild;
	var member = guild.members.get(uID);
	member.removeRole(from);

	member.addRole(to);
	players.forEach(function(value) {
		if(uID == value.id) {
			value.room = to;
			value.bleeding = false;
			value.dancing = false;
		}
	});
}

function mainRoom(user, userID, channelID, goal, goalname) {
	if(rooms.has(channelID)) {
		var currentRoom = rooms.get(channelID);
		if(!checkNeighbours(currentRoom, goal)) {
			sendMessage({
				to: channelID,
				message: user + ': that room is not adjacent to yours',
				typing: true
			});
			
			return;
		}
		sendMessage({
			to: channelID,
			message: user + ': moving you to the ' + goalname
		});

		var originname = bot.channels.get(channelID).name;
		var goalch = channelIDs[roomIDs.indexOf(goal)];
		var result = user + ' enters the ' + goalname + ' from the ' + originname + '\n';
		welcomeEvents.push(new RoomEvent(goalch, result, userID));
		changeRoom(currentRoom, goal, channelID, userID);
		
	} else {
		sendMessage({
			to: channelID,
			message: user + ': youre not in the right channel for this command',
			typing: true
		});
	}
}

function putEveryoneInRoom(roomCH) {
	players.forEach(function(p) {
		changeRoom(p.room, rooms.get(roomCH), roomCH, p.id);	
	});	
}


function rollxdy(x, y) {
	var result = [];
	var i;
	for (i = 0; i < x; i++) {
		let dy = Math.floor(y * Math.random()) + 1;
		result.push(dy);
	}

	return result;


}

function combat(att, def, ch) {
	var user;
	var attW;
	var attStr = 0;
	var defW;
	var defStr = 0;
	var attackingPlayer = players.find( function(p) {return p.id == att;});

	players.forEach( function(p) {
		if(p.id == att) {
			user = p.name;
			attW = p.weapon;
			attStr = powerLevels.get(p.weapon) + p.edge;
			p.edge = 0;
		}
		if (p.id == def) { 
			defW = p.weapon;
			defStr = powerLevels.get(p.weapon) + p.edge;
			p.edge = 0; 
		}
	});

	if (attW == "fluorite-octet") {
		var octet = rollxdy(8,8);
		octet.forEach( function (o) {
			if (o == 8) {attStr++;}
		});
		sendMessage({
			to: ch,
			message: "Rolling the fluorite octet: (" + octet.toString() + ") = " + attStr
		});
	} else if (defW == "fluorite-octet") {
		var octet = rollxdy(8,8);
		octet.forEach( function (o) {
			if (o == 8) {defStr++;}
		});
		sendMessage({
			to: ch,
			message: "Rolling the fluorite octet: (" + octet.toString() + ") = " + defStr
		});
	}

	if (defW == "pokeball") {
		defStr -= 3;
	}

	if(checkIfPlayer(def)) {
		players.forEach(function(value) {
			if (value.id == def) {
				var isKO = value.room == ko.id && knockouts.some( function(e) {return e.victim == def && e.room == ch;} );
 
				if (attStr >= defStr || isKO) {

					if(rooms.get(ch) == value.room || isKO) {
						if (value.alive) {


							if (attW == "tranquilizer-gun") {

								sendMessage({
									to: ch,
									message: user + " knocks " + value.name + " out with their " + attW + "."
								});

								players.forEach( function(p) {
									if (p.id == att) {
										p.weapon = "fists";
										p.removeItem(attW);
									}
								});

								welcomeEvents.push(new RoomEvent(ko.ch, value.name + ": you were knocked out by " + user + ".\nyou will be able to !wakeup in 2 minutes.", value.id));

								changeRoom(value.room, ko.id, ko.ch, value.id);


								var time = new Date();
								var newKO = new KnockOut(value.id, ch, time.getTime());


								if (isKO) {
									knockouts = knockouts.filter( function (k) {return k.victim != value.id;} );
									roomEvents = roomEvents.filter( function (e) {return e.id != value.id;} );
								}
		
								knockouts.push(newKO);
								roomEvents.push(new RoomEvent(ch, "<@" + value.id + "> lies on the floor, out cold.", value.id)); 


							} else if (attW == "pokeball") {
								if (att == def) {
									sendMessage({
										to: ch,
										message: user + ": you can't catch yourself in a pokeball."
									});
									return;
								}
								
								if (players.some( function (p) {return p.room == pokeball.id;})) {
									sendMessage({
										to: ch,
										message: user + ": the pokeball is already occupied."
									});
									return;
								}

								if (isKO) {
									knockouts = knockouts.filter( function (k) {return k.victim != value.id;} );
									roomEvents = roomEvents.filter( function (e) {return e.id != value.id;} );
								}
								
								sendMessage({
									to: ch,
									message: user + " captures " + value.name + " with their " + attW + "."
								});
								welcomeEvents.push(new RoomEvent(pokeball.ch, value.name + ": you were captured by " + user, value.id));

								changeRoom(value.room, pokeball.id, pokeball.ch, value.id);



							} else {
								if (att == def) {
									sendMessage({
										to: ch,
										message: user + " kills themselves with their " + attW + ". the contents of the victim's inventory are transferred to the casino."
									});
								} else {
									sendMessage({
										to: ch,
										message: user + " kills " + value.name + " with their " + attW + " and loots all of their coins. the contents of the victim's inventory are transferred to the casino."
									});
								}

								players.forEach( function(p) {
									if (p.id == att) {
										p.weapon = "fists";
										p.removeItem(attW);
									}
								});

								value.alive = false;
								attackingPlayer.coins += value.coins;
								value.coins = 0;
								casinoInventory = casinoInventory.concat(value.inventory);
								value.inventory = [];

								welcomeEvents.push(new RoomEvent(dead.ch, value.name + ": you were killed by " + user, value.id));
								changeRoom(value.room, dead.id, dead.ch, value.id);

								if ( (attW == "bolt-pistol" || attW == "cash-cannon") && ch != channels.get("disco")) {
									channelIDs.forEach( function (broadcast) {
										if (broadcast != ch && broadcast != channels.get("disco")) {
											sendMessage({
												to: broadcast,
												message: "**BOOM!** you hear a loud noise from the " + bot.channels.get(ch).name
											});
										}

									});


								}

								var newMurder = new Murder(value.id, att, attW, ch);

								if (players.some(function (p) { return (p.id == att) && (p.target != value.id); })) {
									players.forEach( function (p) { if (p.alive && p.target == value.id) {
										p.target = value.target;
										sendMessage({
											to: p.id,
											message: p.name + ": your target has just died. assigning you a new target: <@" + p.target + ">",
											typing: true
										});

									}});
								}



								if (isKO) {
									knockouts = knockouts.filter( function (k) {return k.victim != value.id;} );
									roomEvents = roomEvents.filter( function (e) {return e.id != value.id;} );
								}
		
								murders.push(newMurder);
								roomEvents.push(new RoomEvent(ch, newMurder.description(), value.id)); 
							}
							var now = new Date();
							attackingPlayer.cds.attack = now.getTime();
						} else {
							sendMessage({
								to: ch,
								message: user + ": target is already dead!",
								typing: true
							});
						}

					} else  {
						sendMessage({
							to: ch,
							message: user + ": target is not in the room with you",
							typing: true
						});
				
					}
				} else {
					sendMessage({
						to: ch,
						message: user + " attacks " + value.name + " with their " + attW + ", but they stop the attack with their " + value.weapon + "."
					});
					var now = new Date();
					attackingPlayer.cds.attack = now.getTime();
				}
			}
		});
	} else  {
		sendMessage({
			to: ch,
			message: user + ": I don't know that player",
			typing: true
		});
	}
}

function beginBossFight() {

	roomEvents = [];
	players.forEach( function (p) {
		if (p.alive) {changeRoom(p.room, rooms.get(channels.get("graveyard")), channels.get("graveyard"), p.id);}
	});

	bossFight = true;
	gravey = bot.channels.get(channels.get("graveyard"));
	gravey.startTyping();
	setTimeout( function () {
		sendMessage({
			to: channels.get("graveyard"),
			message: database["boss-fight"].begin
		});
		gravey.stopTyping();

		boss.act();


	}, 10000);
}

function checkNeighbours(from, to) {
	return roomNeighbours.get(from).some(function(value) {
							return value == to;});
}

function checkIfAlive(userID) {
	var result;
	if (players.some(function(p) {
		return p.id == userID;})) {
	players.forEach(function (p) {
		if(p.id == userID) {
			result = p.alive;
		}
	});
	return result;
	} else {
		return false;
	}
}

//events
bot.on('ready', function (evt) {
	logger.info('Connected');
	logger.info('Logged in as: ');
	logger.info(bot.user.username + ' – (' + bot.user.id + ')');
});

bot.on("guildMemberUpdate", function(oldM, newM) {
	if (playing && checkIfPlayer(newM.id)) {
		if ( roomIDs.some( function (role) {return !oldM.roles.has(role) && newM.roles.has(role);} ) ) {
			players.forEach( function (p) {if (p.id == newM.id) {

				var result = "";

				welcomeEvents.forEach(function(e) {
					if (rooms.get(e.room) == p.room && e.id == p.id) {
						result += e.description + "\n";
					}
				});
				welcomeEvents = welcomeEvents.filter(function(e) {return rooms.get(e.room) != p.room || e.id != p.id;});

				roomEvents.forEach(function(e) {
					if (rooms.get(e.room) == p.room) {
						result += p.name + ": " + e.description + "\n";
					}
				});

				var ch;
				if (p.room == dead.id) {
					ch = dead.ch;
				} else if (p.room == pokeball.id) {
					ch = pokeball.ch;
				} else if (p.room == ko.id) {
					ch = ko.ch;
				} else if (p.room == trialgrounds.id) {
					ch = trialgrounds.ch;
				} else {
					ch = channelIDs[roomIDs.indexOf(p.room)];
				}
					
				setTimeout(function() {

					if (result != "") {
						sendMessage({
							to: ch,
							message: result
						});
					}
				},2000);
			}});
		}
	}
});

bot.on('error', function (e) {
	bot.login(auth.token);
});

//MAIN EVENT
bot.on('message', function (msg) {
	var userID = msg.author.id;
	var user;
	var channelID = msg.channel.id;
	var message = msg.content;

	if (msg.member != null) {
		user = msg.member.displayName;
	} else {
		user = msg.author.username;
	}
		

	if (message.substring(0, 1) == '!') {
		var args = message.substring(1).split(' ');
		var cmd = args[0].toLowerCase();
		var obj = "";
		var obj2 = "";
		if (args.length > 1) {obj = args[1].toLowerCase();}
		if (args.length > 2) {obj2 = args[2].toLowerCase();}
			
		args = args.splice(1);


		var activePlayer;
		var isPlayer = checkIfPlayer(userID);

		if (isPlayer) {
			activePlayer = players.find(function(p) {return p.id == userID;});
		}
		
		if (rooms.has(channelID) || channelID == trialgrounds.ch || channelID == dead.ch || channelID == ko.ch || channelID == pokeball.ch) {

			msg.delete();
		switch(cmd) {

			case 'goto':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == dead.ch || channelID == ko.ch || channelID == pokeball.ch ) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **YOU'VE GOT NOWHERE TO RUN TO**",
						typing: true
					});
					break;
				} else if (obj == "") {
					sendMessage({
						to: channelID,
						message: user + ": please specify where you want to go to",
						typing: true
					});
					break;



				} else if (channels.has(obj)) {

					mainRoom(user, userID, channelID, rooms.get(channels.get(obj)), obj);


				} else if (obj == "trial" || obj == "trial-grounds") {
					if(rooms.has(channelID)) {
						var currentRoom = rooms.get(channelID);
						var goal = trialgrounds.id;
						sendMessage({
							to: channelID,
							message: user + ': moving you to the trial-grounds'
						});

						if ( players.some(function (p) {return p.id == userID && p.hasItem("pokeball");}) ) {
							players.forEach (function (p) {

								if(p.room == pokeball.id) {
									welcomeEvents.push(new RoomEvent(trialgrounds.ch, p.name + " is forcibly released from " + user + "'s pokeball", p.id));
									changeRoom(p.room, trialgrounds.id, channelID, p.id);


								}
							});

						}

						if ( players.every(function (p) {return !p.alive || p.room == trialgrounds.id || p.id == userID;}) ) {
							if (murders.length > 0) {
								var i;
								for (i = 0; i < 1000; i++) {
									murders.sort(randomSort);
								}
								welcomeEvents.push(new RoomEvent(trialgrounds.ch, "everyone has arrived. you may now discuss the murder of <@" + murders[murders.length - 1].victim + "> and then !vote for who you think the killer was.", userID));

								changeRoom(currentRoom, goal, channelID, userID);
								voting = true;
							} else {
								welcomeEvents.push(new RoomEvent(trialgrounds.ch, "no murder has been committed! come back when you've done some killing. ejecting everyone from the trial-grounds in 10 seconds...", userID));
								changeRoom(currentRoom, goal, channelID, userID);

								setTimeout(function() {players.forEach(
									function(p) { if (p.alive) {changeRoom(p.room, roomIDs[4], channelID, p.id);} }
								);}, 10000);
							}
						} else {
							changeRoom(currentRoom, goal, channelID, userID);

						}
					} else {
						sendMessage({
							to: channelID,
							message: user + ': youre not in the right channel for this command',
							typing: true
						});
					}
				} else {
					sendMessage({
						to: channelID,
						message: user + ": I don't recognize that room",
						typing: true
					});	
				}
				
			break;

			case 'defend':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!checkIfPlayer(userID) || (!playing || !checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					if (players.some( function(p) {return (p.id == userID) && p.acted;})) {
						sendMessage({
							to: channelID,
							message: user + ": you've already performed an action this turn",
							typing: true
						});
						break;
					}

					players.forEach( function (p) { 
						if (p.id == userID) {
							p.acted = true;	
							p.lastAction = "defend";
						}
					});

					sendMessage({
						to: channelID,
						message: user + " braces to defend against incoming attacks.",
						typing: true
					});
					if ( players.every(function (p) {return p.acted || !p.alive;}) ) {
						setTimeout(function() {
							boss.act();
						}, 2000);

					}
				} else {
					sendMessage({
						to: channelID,
						message: user + ": what are you afraid of? some giant skeleton turtle wiping your party?",
						typing: true
					});
					break;

				}
				break;
			
			case 'attack':
				var now = new Date();
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!checkIfPlayer(userID) || (!playing || !checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					if (players.some( function(p) {return (p.id == userID) && p.acted;})) {
						sendMessage({
							to: channelID,
							message: user + ": you've already performed an action this turn",
							typing: true
						});
						break;
					}


					var weapon;
					players.forEach(function(p) {
						if (p.id == userID) {
							weapon = p.weapon;
						}
					});

					var result = user + " attacks with their " + weapon;
					
					if (weapon == "death-note" || weapon == "tranquilizer-gun" || weapon == "pokeball") {
						result += ", but it has no effect on the Negaturtle.";
					} else if (weapon == "fluorite-octet") {
						var damage = 0;
						var octet = rollxdy(8,8);
						octet.forEach( function (o) {
							if (o == 8) {damage++;}
						});
						result += " and deals " + damage + " points of damage to the Negaturtle.";
						sendMessage({
							to: channelID,
							message: "Rolling the fluorite octet: " + octet.toString()
						});
						boss.hp -= damage;

					} else {
						result += " and deals " + powerLevels.get(weapon) + " points of damage to the Negaturtle.";
						boss.hp -= powerLevels.get(weapon);
					}
		

					players.forEach( function (p) { 
						if (p.id == userID) {
							p.acted = true;	
							p.lastAction = "attack";
						}
					});
					
					sendMessage({
						to: channelID,
						message: result,
						typing: true
					});

					if (boss.hp < 1) {
						setTimeout(function() {
							sendMessage({
								to: channelID,
								message: database["boss-fight"].victory,
								typing: true
							});
							bossFight = false;

						}, 2000);
						
					} else if ( players.every(function (p) {return p.acted || !p.alive;}) ) {
						setTimeout(function() {
							boss.act();
						}, 2000);

					}
					break;
				} else if (now.getTime() - activePlayer.cds.attack < 10000) {
					sendMessage({
						to: channelID,
						message: user + ": you can only use this command once every 10 seconds",
						typing: true
					});
					break;
					
				}
				obj = obj.replace(/[<>@!]/g, "");

				var weapon;
				players.forEach(function(p) {
					if (p.id == userID) {
						weapon = p.weapon;
					}
				});
				
				if (weapon == "death-note") {
					if (!players.some( function (p) { return p.id == userID && p.bleeding; }) ) {
						sendMessage({
							to: channelID,
							message: user + ": you have nothing to write with",
							typing: true
						});
						break;
					} else {

						sendMessage({
							to: channelID,
							message: user + ": you let out a maniacal cackle as you write the name in your own blood.",
							typing: true
						});

						var name = obj;

						players.forEach( function (p) { 
							if (p.id == userID) {
								p.weapon = "fists";
								p.removeItem("death-note");
							}	

						 });



						setTimeout( function () {

							players.forEach( function (p) { 
								if(p.id == obj && p.room != dead.id && p.room != pokeball.id && p.room != trialgrounds.id) {
									
									if(p.room == ko.id) {
										var dest;
										knockouts.forEach( function (k) {
											if(k.victim == p.id) {
												time -= k.time;
												dest = k.room;
											}
										});
										knockouts = knockouts.filter( function (k) {return k.victim != p.id;} );
										roomEvents = roomEvents.filter( function (e) {return e.id != p.id;} );
										welcomeEvents.push(new RoomEvent(dest, p.name + "'s body jerks upright", p.id));
										changeRoom(p.room, rooms.get(dest), dest, p.id);
									}

									ch = channelIDs[roomIDs.indexOf(p.room)];

									var newMurder = new Murder(p.id, userID, "death-note", ch);

									if (players.some(function (pl) { return (pl.id == userID) && (pl.target != p.id); })) {
										players.forEach( function (pl) { if (pl.alive && pl.target == p.id) {
											pl.target = p.target;
											sendMessage({
												to: pl.id,
												message: pl.name + ": your target has just died. assigning you a new target: <@" + pl.target + ">",
												typing: true
											});

										}});
									}


									murders.push(newMurder);
									roomEvents.push(new RoomEvent(ch, newMurder.description(), p.id)); 
									
									sendMessage({
										to: ch,
										message: p.name + ": you grasp your chest, as your heart suddenly gives out and you die. the contents of your inventory are transferred to the casino.",
										typing: true
									});
									p.alive = false;
									casinoInventory = casinoInventory.concat(p.inventory);
									welcomeEvents.push(new RoomEvent(dead.ch, p.name + ": you have died from a heart attack.", p.id));
									changeRoom(p.room, dead.id, dead.ch, p.id);
									name = "<@" + p.id + ">";
								}

							});
						}, 40000);
						
						
						roomEvents.push(new RoomEvent(channelID, "the death note lies in the middle of the room with the name " + name + " scrawled in blood in it.", userID)); 
						
					}
					activePlayer.cds.attack = now.getTime();
				} else {
					combat(userID, obj, channelID);
				}
				

			break;

			case 'use':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if( channelID == trialgrounds.id || channelID == dead.id ) {
					sendMessage({
						to: channelID,
						message: user + ": you can't use items here",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **YOUR TOYS WON'T SAVE YOU NOW**",
						typing: true
					});
					break;
				} else if( !players.some( function(p) {return p.id == userID && p.inventory.includes(obj);}) ) {
					sendMessage({
						to: channelID,
						message: user + ": you don't have that item",
						typing: true
					});
					break;
				} else {
					if (weapons.includes(obj)) {
						switch (obj) {
							case 'knife':
								sendMessage({
									to: channelID,
									message: user + ": you prick yourself in the finger. Ouch! You bleed all over the floor.",
									typing: true
								});
								players.forEach( function(p) { if (p.id == userID) {
									p.bleeding = true;
								} });
								roomEvents.push(new RoomEvent(channelID, "there's a small bloodstain on the floor", userID)); 
								break;
							case 'fluorite-octet':
								if (channelID == channelIDs[1]) {
									var result = user + ": You give the fluorite octet to the casino attendant.\n"
									if (casinoOpen) {
										result += "They tell you they already got some dice to play with earlier, but they give you 5 coins as a token of appreciation anyway.";
										players.forEach( function(p) { if (p.id == userID) {
											p.coins += 5;
											p.removeItem("fluorite-octet");
											if (p.weapon == "fluorite-octet") {p.weapon = "fists";}
										} });
									} else {
										result += "They tell you the casino can now open. As a token of their appreciation you get 10 coins to start playing with.";
										players.forEach( function(p) { if (p.id == userID) {
											p.coins += 10;
											p.removeItem("fluorite-octet");
											if (p.weapon == "fluorite-octet") {p.weapon = "fists";}
										} });
										casinoOpen = true;
										casinoDice.push(8);
									}
									sendMessage({
										to: channelID,
										message: result,
										typing: true
									});
								} else {
									sendMessage({
										to: channelID,
										message: user + ": there's nothing here to use " + obj + " on",
										typing: true
									});
								}
								break;
							case 'pokeball':
								players.forEach( function(p) {
									if (p.room == pokeball.id) {
										changeRoom(p.room, rooms.get(channelID), channelID, p.id);
										sendMessage({
											to: channelID,
											message: "Go, " + p.name + ", I choose you!",
											typing: true
										});
									}
								});

								break;
							default:
								sendMessage({
									to: channelID,
									message: user + ": there's nothing here to use " + obj + " on",
									typing: true
								});


						}

					} else if (database.roomforobject[obj] == bot.channels.get(channelID).name) {
						var result = user + ": " + database.use[obj] + "\n";
						
						switch(obj) {
							case 'codex-astartes':
								var rewards = ["chainsword", "bolt-pistol"];
								var i;
								for (i = 0; i < 1000; i++) {
									rewards.sort(randomSort);
								}
								var reward = rewards.pop();
								players.forEach( function(p) { if (p.id == userID) {
										p.addItem(reward);
										p.addItem("miniature");
									} });
								result += "You receive the " + reward + " and the miniature.";
								break;
							case 'nendoroid':
								var rewards = ["scissor-blade", "death-note", "cheatcode"];
								var i;
								for (i = 0; i < 1000; i++) {
									rewards.sort(randomSort);
								}
								var reward = rewards.pop();
								players.forEach( function(p) { if (p.id == userID) {
										p.addItem(reward);
									} });
								result += "You receive the " + reward + ".";
								break;
							case 'sburb-beta':
								var rewards = ["warhammer-of-zillyhoo", "fluorite-octet"];
								var i;
								for (i = 0; i < 1000; i++) {
									rewards.sort(randomSort);
								}
								var reward = rewards.pop();
								players.forEach( function(p) { if (p.id == userID) {
										p.addItem(reward);
									} });
								result += "You receive the " + reward + ".";
								break;
							case 'key':
								var rewards = ["tranquilizer-gun", "dnd-dice"];
								var i;
								for (i = 0; i < 1000; i++) {
									rewards.sort(randomSort);
								}
								var reward = rewards.pop();
								players.forEach( function(p) { if (p.id == userID) {
										p.addItem(reward);
									} });
								result += "You receive the " + reward + ".";
								break;
							case 'dnd-dice':
								var newDice = [4, 6, 8, 10, 12, 20];
								if (casinoOpen) {
									result += "They tell you they already got some dice to play with earlier, but they give you 5 coins as a token of appreciation anyway.";
									players.forEach( function(p) { if (p.id == userID) {
										p.coins += 5;
									} });
									casinoDice = newDice;
								} else {
									result += "They tell you the casino can now open. As a token of their appreciation you get 10 coins to start playing with.";
									players.forEach( function(p) { if (p.id == userID) {
										p.coins += 10;
									} });
									casinoOpen = true;
									newDice.forEach(function(d) {
										if (!casinoDice.includes(d)) {
											casinoDice.push(d);
										}
									});
								}

								break;

							case 'badge':
								magic.red = true;
								roomEvents.push(new RoomEvent(channelID, "the red socket glows brightly", userID));
								if (magic.ready()) {
									beginBossFight();
								}
								break;
							case 'dollar-bill':
								magic.green = true;
								roomEvents.push(new RoomEvent(channelID, "the green socket glows brightly", userID)); 
								if (magic.ready()) {
									beginBossFight();
								}
								break;
							case 'pearl':
								magic.white = true;
								roomEvents.push(new RoomEvent(channelID, "the white socket glows brightly", userID)); 
								if (magic.ready()) {
									beginBossFight();
								}
								break;
							case 'miniature':
								magic.blue = true;
								roomEvents.push(new RoomEvent(channelID, "the blue socket glows brightly", userID)); 
								if (magic.ready()) {
									beginBossFight();
								}
								break;
							case 'crystal':
								magic.black = true;
								roomEvents.push(new RoomEvent(channelID, "the black socket glows brightly", userID)); 
								if (magic.ready()) {
									beginBossFight();
								}
								break;
						}

						sendMessage({
							to: channelID,
							message: result
						});

						if (obj == "cheatcode") {
							welcomeEvents.push(new RoomEvent(channels.get("weeb-corner"), user + " suddenly emerges from a pile of body pillows!", userID));
							changeRoom(roomIDs[0], roomIDs[8], channelID, userID);
						} else {
							players.forEach(function (p) { if (p.id == userID) {p.removeItem(obj);}});
						}

						break;
					} else {
						sendMessage({
							to: channelID,
							message: user + ": there's nothing here to use " + obj + " on",
							typing: true
						});
						break;
					}
				}
				
			break;

			case 'look':
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID))) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": The Negaturtle towers over you. Will you fight or will you perish?",
						typing: true
					});
					break;
				}
				var chname = bot.channels.get(channelID).name;
				var result = user + ": " + database.descriptions[chname] + "\n";
				roomEvents.forEach(function(e) {
					if (e.room == channelID) {
						result += user + ": " + e.description + "\n";

					}
				});
				sendMessage({
					to: channelID,
					message: result
				});
			break;

			case 'peek':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}

				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch || channelID == dead.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **WHAT ARE YOU LOOKING FOR? I'M RIGHT HERE**",
						typing: true
					});
					break;
				} else if (obj == "") {
					sendMessage({
						to: channelID,
						message: user + ": please specify which room you want to peek into",
						typing: true
					});
					break;
				} else if (!channels.has(obj)) {
					sendMessage({
						to: channelID,
						message: user + ": that is not a valid room",
						typing: true
					});
					break;
					
				} else if ( !roomNeighbours.get(rooms.get(channelID)).includes(rooms.get(channels.get(obj))) ){
					sendMessage({
						to: channelID,
						message: user + ': that room is not adjacent to yours',
						typing: true
					});
					break;
				} else {
					var result = user + ": you peek into the " + obj + ". you see the following players:";
					
					players.forEach( function(p) { if (p.room == rooms.get(channels.get(obj))) {result += "\n<@" + p.id + ">"} });
					sendMessage({
						to: channelID,
						message: result,
						typing: true
					});
				}

			break;

			case 'vote':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID))) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **I'M NOT BOUND BY YOUR SILLY RULES**",
						typing: true
					});
					break;
				}
				
				if(channelID == trialgrounds.ch) {
					if (voting) {
						obj = obj.replace(/[<>@!]/g, "");
						var ccase = murders[murders.length - 1];
						
						if (checkIfPlayer(obj)) {
							if (players.some(function(p) {return p.id == userID && !p.voted;})) {
								players.forEach(function(p) {if (p.id == obj || p.name == obj) {p.votes++;}});
								sendMessage({
									to: channelID,
									message: user + ": successfully recorded your vote",
									typing: true
								});
								players.forEach(function(p) {if (p.id == userID) {p.voted = true;}});
								if ( players.every(function(p) {return !p.alive || p.voted;}) ) {
									voting = false;
									players.forEach(function(p) {p.voted = false;});
									var result = "voting concluded. announcing the results:";

									var mostVotes = 0;
									var decision = "tie";

									players.forEach(function(p) {
										var currentVotes = p.votes;
										if (currentVotes > mostVotes) { 
											mostVotes = currentVotes; 
											decision = p.id;
										} else if (currentVotes == mostVotes) {	
											decision = "tie";
										}
										result = result + "\n<@" + p.id + ">: " + p.votes + " votes";
										p.votes = 0;

									});

									if( decision == "tie" ) {
										sendMessage({
											to: channelID,
											message: result + "\n\nno consensus reached",
											typing: true
										});
									} else {
										sendMessage({
											to: channelID,
											message: result + "\n\n<@" + decision + "> got the most votes",
											typing: true
										});
									}
									

									if( ccase.culprit == decision ) {
										losers.push(decision);
									} else if (players.some(function(p) {return p.id == ccase.culprit && p.target == ccase.victim;})) {
										winners.push(ccase.culprit);
									}

									murders.pop();
									var result = "";
									if(murders.length == 0) {
										result = "the trial has reached it's conclusion. ";

										winners = winners.filter( function(w) {return !losers.includes(w);} );
										losers = losers.filter( function(l) {return players.some( function(p) { return p.id == l && p.alive ; } ); });

										if (winners.length > 0) {
											result += "you have voted incorrectly. the following players have won:";

											winners.forEach(function(w) {
												result = result + "\n" + "<@" + w + ">";
												let random = Math.floor(database.glimpses.length * Math.random());
												let glimpse = database.glimpses[random];
												sendMessage({
													to: w,
													message: "You catch a glimpse of the truth:\n" + glimpse + "\nThe vision ends."
												});
											});
										} else {
											result += "you have voted correctly.";

											if (losers.length > 0) {
												result += " the following players will be executed:";

												losers.forEach(function(l) {
													result = result + "\n<@" + l + ">";
													players.forEach(function(p) { if (p.id == l) { p.alive = false; } });
													changeRoom(trialgrounds.id, dead.id, channelID, l);


												});
											}


										}
										
										var leftAlive = 0;
										players.forEach(function(p) { if (p.alive) {leftAlive++;} });

										if (winners.length > 0) {
											result = result + "\nthe game is over. use !endgame to return to the lobby.";
											sendMessage({
												to: channelID,
												message: result,
												typing: true
											});
										} else if (leftAlive < 4) {
											result = result + "\nthe game is over. everyone left alive wins. use !endgame to return to the lobby.";
											sendMessage({
												to: channelID,
												message: result,
												typing: true
											});
										} else {
											result = result + "\nthe game continues. evicting everyone from the trial-grounds in 10 seconds.";
											sendMessage({
												to: channelID,
												message: result,
												typing: true
											});

											players.forEach( function (p) {
												if (p.alive && !checkIfAlive(p.target)) {
													while (!checkIfAlive(p.target)) {
														players.forEach( function (ctarg) {if (ctarg.id == p.target) {
															p.target = ctarg.target;
														}});

													}
													sendMessage({
														to: p.id,
														message: p.name + ": your target has just died. assigning you a new target: <@" + p.target + ">"
													});
												}

											});

											setTimeout(function() {players.forEach(
												function(p) { if (p.alive) {changeRoom(p.room, roomIDs[4], channelID, p.id);} }
											);}, 10000);
										}
									} else {
										sendMessage({
											to: trialgrounds.ch,
											message: "case closed. you may now discuss the murder of <@" + murders[murders.length - 1].victim + "> and then !vote for who you think the killer was.",
											typing: true
										});
										voting = true;
									}
								}
							} else {
								sendMessage({
									to: channelID,
									message: user + ": you've already voted",
									typing: true
								});
							}
						} else {
							sendMessage({
								to: channelID,
								message: user + ": I don't know that user",
								typing: true	
							});
						}
					} else {
						sendMessage({
							to: channelID,
							message: user + ": voting hasn't begun yet. please wait for everyone to arrive.",
							typing: true
						});
					}
				} else {
					sendMessage({
						to: channelID,
						message: user + ": can only vote in the trial-grounds",
						typing: true
					});
				}				

				break;

			case 'pray':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **HAHAHA! YES, BEG FOR YOUR PATHETIC LIVES!**",
						typing: true
					});
					break;
				}
				if (channelID == channelIDs[5]) {
					if ( players.some( function (p) {return !p.alive;}) ) {
						if (magic.black || players.some( function (p) {return p.hasItem("crystal");} )) {
							sendMessage({
								to: channelID,
								message: user + ": the dead remain silent.",
								typing: true
							});
							break;
						}
						players.forEach( function (p) {
							if (p.id == userID) {
								if (p.hasItem("pearl")) {
									p.addItem("crystal");
									sendMessage({
										to: channelID,
										message: user + ": you open your mind to the spirits of the dead and they answer. dark energies rise all around you, trying to take hold of you."
											+ " but the hope in your heart protects you. the swirling despair crystallizes in your inventory."
									});

								} else {
									sendMessage({
										to: channelID,
										message: user + ": you open your mind to the spirits of the dead and they answer. dark energies rise all around you, trying to take hold of you."
											+ " you struggle, but soon you lose hope. your flesh blackens and cracks and you die in agony. the contents of your inventory are transferred to the casino."
									});
									p.alive = false;
									casinoInventory = casinoInventory.concat(p.inventory);
									changeRoom(p.room, dead.id, dead.ch, p.id);

									var newMurder = new Murder(p.id, p.id, "despair", channelID);

							

									if (p.target != p.id) {
										players.forEach( function (pl) { if (pl.alive && pl.target == p.id) {
											pl.target = p.target;
											sendMessage({
												to: pl.id,
												message: pl.name + ": your target has just died. assigning you a new target: <@" + pl.target + ">",
												typing: true
											});

										}});
									}

									murders.push(newMurder);
									roomEvents.push(new RoomEvent(channelID, newMurder.description(), p.id)); 
									

								}
							}
						});

					} else {
						sendMessage({
							to: channelID,
							message: user + ": there is no one to answer your prayer",
							typing: true
						});
					}

				} else {
					sendMessage({
						to: channelID,
						message: user + ": your god can't save you now",
						typing: true
					});
				}		
				
			break;

			case 'oracle':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command"
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **THAT FOOL HAS NO POWER OVER MY REALM**"
					});
					break;
				} else if (channelID == channels.get("throne-room")) {
					sendMessage({
						to: channelID,
						message: user + ": " + database.oracle
					});
					break;


				} else {
					sendMessage({
						to: channelID,
						message: user + ": there's nobody with prophetic abilities here"
					});
					break;
				}


			break;

			case 'oracle-location':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command"
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **THAT FOOL HAS NO POWER OVER MY REALM**"
					});
					break;
				} else if (channelID == channels.get("throne-room")) {

					obj = obj.replace(/[<>@!]/g, "");
					if (obj == "") {
						sendMessage({
							to: channelID,
							message: user + ": please specify which player you want to get an oracle about"
						});
						break;



					} else if (!checkIfPlayer(obj)) {
						sendMessage({
							to: channelID,
							message: user + ": I don't recognize that player"
						});
						break;
					} else if (!players.some(function(p) {return p.id == userID && p.coins > 0;})) {
						sendMessage({
							to: channelID,
							message: user + ": you can't afford this service"
						});
						break;

					} else if (!checkIfAlive(obj)) {
						sendMessage({
							to: channelID,
							message: user + ": you can't get an oracle about a dead player"
						});
						break;

					} else {
						var result = "";
						players.forEach(function(p) {
							if (p.id == obj) {
								switch (p.room) {
									case roomIDs[0]:
										result = "the requested player is currently in the arcade"
										break;
									case roomIDs[1]:
										result = "the requested player is currently in the casino"
										break;
									case roomIDs[2]:
										result = "the requested player is currently in the disco"
										break;
									case roomIDs[3]:
										result = "the requested player is currently in the throne-room"
										break;
									case roomIDs[4]:
										result = "the requested player is currently in the lobby"
										break;
									case roomIDs[5]:
										result = "the requested player is currently in the graveyard"
										break;
									case roomIDs[6]:
										result = "the requested player is currently in the laboratory"
										break;
									case roomIDs[7]:
										result = "the requested player is currently in the arena"
										break;
									case roomIDs[8]:
										result = "the requested player is currently in the weeb-corner"
										break;
									case trialgrounds.id:
										result = "the requested player is currently in the trial-grounds"
										break;
									case ko.id:
										result = "the requested player is currently unconscious"
										break;
									case pokeball.id:
										result = "the requested player is currently trapped inside a pocket dimension"
										break;

								}

							}
							if (p.id == userID) {

								p.coins -= 1;
							}

						});
						sendMessage({
							to: channelID,
							message: user + ": you pay 1 coin.\n" + result
						});

						sendMessage({
							to: obj,
							message: "you feel like you're being watched."
						});
						break;
					}
				} else {
					sendMessage({
						to: channelID,
						message: user + ": there's nobody with prophetic abilities here"
					});
					break;
				}


			break;

			case 'oracle-weapon':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command"
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **THAT FOOL HAS NO POWER OVER MY REALM**"
					});
					break;
				} else if (channelID == channels.get("throne-room")) {

					obj = obj.replace(/[<>@!]/g, "");
					if (obj == "") {
						sendMessage({
							to: channelID,
							message: user + ": please specify which player you want to get an oracle about"
						});
						break;



					} else if (!checkIfPlayer(obj)) {
						sendMessage({
							to: channelID,
							message: user + ": I don't recognize that player"
						});
						break;
					} else if (!players.some(function(p) {return p.id == userID && p.coins > 4;})) {
						sendMessage({
							to: channelID,
							message: user + ": you can't afford this service"
						});
						break;

					} else if (!checkIfAlive(obj)) {
						sendMessage({
							to: channelID,
							message: user + ": you can't get an oracle about a dead player"
						});
						break;

					} else {
						var result = "";
						players.forEach(function(p) {
							if (p.id == obj) {
								result = "the requested player currently has their " + p.weapon + " equipped.";

							}
							if (p.id == userID) {

								p.coins -= 5;
							}

						});
						sendMessage({
							to: channelID,
							message: user + ": you pay 5 coins.\n" + result
						});

						sendMessage({
							to: obj,
							message: "you feel like you're being watched."
						});
						break;
					}
				} else {
					sendMessage({
						to: channelID,
						message: user + ": there's nobody with prophetic abilities here"
					});
					break;
				}


			break;

			case 'oracle-inventory':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command"
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **THAT FOOL HAS NO POWER OVER MY REALM**"
					});
					break;
				} else if (channelID == channels.get("throne-room")) {

					obj = obj.replace(/[<>@!]/g, "");
					if (obj == "") {
						sendMessage({
							to: channelID,
							message: user + ": please specify which player you want to get an oracle about"
						});
						break;



					} else if (!checkIfPlayer(obj)) {
						sendMessage({
							to: channelID,
							message: user + ": I don't recognize that player"
						});
						break;
					} else if (!players.some(function(p) {return p.id == userID && p.coins > 9;})) {
						sendMessage({
							to: channelID,
							message: user + ": you can't afford this service"
						});
						break;

					} else if (!checkIfAlive(obj)) {
						sendMessage({
							to: channelID,
							message: user + ": you can't get an oracle about a dead player"
						});
						break;


					} else {
						var result = "";
						players.forEach(function(p) {
							if (p.id == obj) {
								result = "the requested player currently has the following items in their inventory:\n";
								p.inventory.forEach(function(item) {result += item + "\n";});

							}
							if (p.id == userID) {

								p.coins -= 10;
							}

						});
						sendMessage({
							to: channelID,
							message: user + ": you pay 10 coins.\n" + result
						});

						sendMessage({
							to: obj,
							message: "you feel like you're being watched."
						});
						break;
					}
				} else {
					sendMessage({
						to: channelID,
						message: user + ": there's nobody with prophetic abilities here"
					});
					break;
				}


			break;

			case 'oracle-target':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command"
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **THAT FOOL HAS NO POWER OVER MY REALM**"
					});
					break;
				} else if (channelID == channels.get("throne-room")) {

					obj = obj.replace(/[<>@!]/g, "");
					if (obj == "") {
						sendMessage({
							to: channelID,
							message: user + ": please specify which player you want to get an oracle about"
						});
						break;



					} else if (!checkIfPlayer(obj)) {
						sendMessage({
							to: channelID,
							message: user + ": I don't recognize that player"
						});
						break;
					} else if (!players.some(function(p) {return p.id == userID && p.coins > 19;})) {
						sendMessage({
							to: channelID,
							message: user + ": you can't afford this service"
						});
						break;

					} else if (!checkIfAlive(obj)) {
						sendMessage({
							to: channelID,
							message: user + ": you can't get an oracle about a dead player"
						});
						break;

					} else {
						var result = "";
						players.forEach(function(p) {
							if (p.id == obj) {
								result = "the requested player currently has <@" + p.target + "> as their target.";

							}
							if (p.id == userID) {

								p.coins -= 20;
							}

						});
						sendMessage({
							to: channelID,
							message: user + ": you pay 20 coins.\n" + result
						});

						sendMessage({
							to: obj,
							message: "you feel like you're being watched."
						});
						break;
					}
				} else {
					sendMessage({
						to: channelID,
						message: user + ": there's nobody with prophetic abilities here"
					});
					break;
				}


			break;

			case 'dance':
				if (isPlayer) {
					activePlayer.distracting = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command"
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **QUIT THE FANCY FOOTWORK**"
					});
					break;
				} else if (channelID == channels.get("disco")) {
					var activePlayer = players.find(function (p) {return p.id == userID;});
					if (activePlayer.dancing) {
						activePlayer.dancing = false;
						sendMessage({
							to: channelID,
							message: user + ": you stop dancing."
						});
						break;
						
					} else {
						if (players.some(function (p) {return p.dancing;})) {
							var otherDancer = players.find(function(p) {return p.dancing;});
							activePlayer.dancing = true;
							sendMessage({
								to: channelID,
								message: user + " joins " + otherDancer.name + " on the dance floor.\nseeing the two of you moving your bodies to the music, the space marine can't hold back any longer and finally lets loose. you are both in awe of his sweet dance moves. you never would have guessed anyone could move like this with all that heavy armour on.\n"
							});
							if (activePlayer.edge == 0) {
								activePlayer.edge = 1;
								sendMessage({
									to: channelID,
									message: activePlayer.name + ": dancing with the space marine has temporarily increased your physical prowess. you will have an edge for the next fight you're involved in."
								});
							} else {
								sendMessage({
									to: channelID,
									message: activePlayer.name + ": you already have an edge."
								});

							}

							if (otherDancer.edge == 0) {
								otherDancer.edge = 1;
								sendMessage({
									to: channelID,
									message: otherDancer.name + ": dancing with the space marine has temporarily increased your physical prowess. you will have an edge for the next fight you're involved in."
								});
							} else {
								sendMessage({
									to: channelID,
									message: otherDancer.name + ": you already have an edge."
								});

							}

							otherDancer.dancing = false;
							activePlayer.dancing = false;
							break;


						} else {
							activePlayer.dancing = true;
							sendMessage({
								to: channelID,
								message: user + ": you start busting out some moves on the dance floor. you notice the space marine tapping along with his foot, but when you look at him directly, he stops and looks away bashfully. maybe if you got some more company, he would feel comfortable joining in."
							});
							break;
						}

					}

				} else {
					sendMessage({
						to: channelID,
						message: user + ": you do a little jig, but you can't really get into it without some decent music."
					});
					break;


				}

			break;

			case 'mine':
			case 'dig':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				var now = new Date();
				now = now.getTime();
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **YOU CAN'T ESCAPE**",
						typing: true
					});
					break;
				} else if (channelID == channels.get("weeb-corner")) {
					if (players.some(function(p) {return p.id == userID && now - p.cds.mine < 20000;})) {
						sendMessage({
							to: channelID,
							message: user + ": you can only use this command once every 20 seconds"
						});
						break;
					}
					if (!players.some(function(p) {return p.id != userID && p.distracting;})) {
						sendMessage({
							to: channelID,
							message: user + ": as soon as you make a move for the anime piles, the otaku turns away from the TV and looks directly at you, like he *knows*. you decide it's better not to incur his wrath. it seems like you will need a distraction."
						});
						break;


					} else {
						activePlayer.cds.mine = now;
						if (animePile.length > 0) {
							var rndm = Math.random();
							if (rndm > 0.33) {
								var loot = animePile.pop();
								players.forEach(function (p) {
									if (p.id == userID) {
										p.addItem(loot);
									}
								});
								sendMessage({
									to: channelID,
									message: user + ": you dig through the piles and find " + loot,
									typing: true
								});

							} else {
								sendMessage({
									to: channelID,
									message: user + ": you dig through the piles, but you find only worthless trash.",
									typing: true
								});
							}

						} else {
							sendMessage({
								to: channelID,
								message: user + ": you dig through the piles, but you find only worthless trash. you think this well has dried up.",
								typing: true
							});
							break;
						}
						
					}
				} else {
					sendMessage({
						to: channelID,
						message: user + ": you can't do that here.",
						typing: true
					});
					break;

				}

			break;

			case 'distract':
			case 'distraction':
				if (isPlayer) {
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **I DON'T FALL FOR CHEAP TRICKS LIKE THAT**",
						typing: true
					});
					break;
				} else if (channelID == channels.get("weeb-corner")) {
					var activePlayer = players.find(function(p) {return p.id == userID;});
					if (activePlayer.distracting) {
						activePlayer.distracting = false;
						sendMessage({
							to: channelID,
							message: user + ": you make up some excuse for why you have to go and leave the otaku to his animes."
						});
						break;
					} else if (players.some(function(p) {return p.id != userID && p.distracting;})) {
						sendMessage({
							to: channelID,
							message: user + ": someone else is already hogging the otaku's attention"
						});
						break;
					} else {
						activePlayer.distracting = true;
						sendMessage({
							to: channelID,
							message: user + ": you pretend to be interested in anime to get the otaku's attention. he pauses his TV and starts bombarding you with information about all of his favorite animes and waifus. it's the most mind-numbing stuff you've ever had to listen to. you immediately regret this decision."
						});
						break;
					}
				} else {
					sendMessage({
						to: channelID,
						message: user + ": you act in a very distracting manner, but nobody cares.",
						typing: true
					});
					break;

				}

			break;
			
			case 'play':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **I DON'T PLAY GAMES**",
						typing: true
					});
					break;
				} else if (channelID == channels.get("casino")) {
					if (!casinoOpen) {
						sendMessage({
							to: channelID,
							message: user + ": the casino attendant regrets to inform you that they don't have any dice to play with. you can still buy and sell prizes for coins, though.",
							typing: true
						});
						break;

					} else {

						var dicetype;
						var price = 2;

						switch (obj) {
							case '4':
							case 'd4':
							case '2d4':
								if (casinoDice.includes(4)) {
									dicetype = 4;
									price = 1;
								}
								break;
							case '6':
							case 'd6':
							case '2d6':
								if (casinoDice.includes(6)) {
									dicetype = 6;
								}
								break;
							case '8':
							case 'd8':
							case '2d8':
							case '':
								if (casinoDice.includes(8)) {
									dicetype = 8;
								}
								break;
							case '10':
							case 'd10':
							case '2d10':
								if (casinoDice.includes(10)) {
									dicetype = 10;
								}
								break;
							case '12':
							case 'd12':
							case '2d12':
								if (casinoDice.includes(12)) {
									dicetype = 12;
								}
								break;
							case '20':
							case 'd20':
							case '2d20':
								if (casinoDice.includes(20)) {
									dicetype = 20;
									price = 4;
								}
								break;
							
						}

						if (dicetype == null) {
							sendMessage({
								to: channelID,
								message: user + ": that's not a valid game to play at this time.",
								typing: true
							});
							break;
						}

						if (activePlayer.coins < price) {
							sendMessage({
								to: channelID,
								message: user + ": you don't have enough coins to buy into this game.",
								typing: true
							});
							break;



						}

						players.forEach( function (p) {
							if (p.id == userID) {
								p.coins -= price;

								var dice = rollxdy(2,dicetype);
								var result;
								if (price == 1) {
									result = user + ": You pay " + price + " coin to play. You roll 2d" + dicetype + ". If you get doubles, you win the number you got doubles of squared coins.\n" + dice + "\n";
								} else {
									result = user + ": You pay " + price + " coins to play. You roll 2d" + dicetype + ". If you get doubles, you win the number you got doubles of squared coins.\n" + dice + "\n";
								}
								if (dice[0] == dice[1]) {
									var prize = dice[0] * dice[0];
									result += "It's your lucky day! You win " + prize + " coins. You can trade them for prizes."
									p.coins += prize;
								} else {
									result += "You lose. Better luck next time."
								}
								sendMessage({
									to: channelID,
									message: result,
									typing: true
								});

							}

						});
					}


				} else if (channelID == channels.get("arcade")) {
					var result = user + ": ";
					players.forEach( function(p) {
						if (p.id == userID) {
							if (p.coins > 0) {
								p.coins--;

								var i;
								for (i = 0; i < 1000; i++) {
									arcadeGames = arcadeGames.sort(randomSort);
								}
								result += "You insert a coin into one of the machines.\n" + arcadeGames[0];
							} else {
								result += "you don't have any coins to play with."
							}
						}
					});
					sendMessage({
						to: channelID,
						message: result,
						typing: true
					});
					break;
					
				} else {
					sendMessage({
						to: channelID,
						message: user + ": there aren't any games to play here.",
						typing: true
					});
					break;

				}

			break;

			case 'prizes':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **YOUR ONLY PRIZE WILL BE A SWIFT DEMISE, IF YOU SUBMIT NOW**",
						typing: true
					});
					break;
				} else if (channelID != channels.get("casino")) {
					sendMessage({
						to: channelID,
						message: user + ": there are no prizes here.",
						typing: true
					});
					break;
				} else {
					var result = user + ": the casino offers the following prizes:"

					casinoInventory.forEach( function (i) {
						result += "\n" + i + ": " + database.casinoprices[i] + " coins";
						
					});


					sendMessage({
						to: channelID,
						message: result,
						typing: true
					});
				}
			break;

			case 'buy':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **I HAVE NO USE FOR THOSE RIDICULOUS TOKENS OF YOURS**",
						typing: true
					});
					break;
				} else if (channelID != channels.get("casino")) {
					sendMessage({
						to: channelID,
						message: user + ": there's nothing to buy here",
						typing: true
					});
					break;
				} else if (obj == "") {
					sendMessage({
						to: channelID,
						message: user + ": please specify what you want to buy. (!prizes to see what items are on offer)",
						typing: true
					});
					break;					
				} else if (!casinoInventory.includes(obj)) {
					sendMessage({
						to: channelID,
						message: user + ": they don't have that item. (!prizes to see what items are on offer)",
						typing: true
					});
					break;					
				}  else {

					players.forEach (function (p) {
						if (p.id == userID) {
							var price = database.casinoprices[obj];
							if (p.coins < price) {
								result = user + ": you can't afford this item";
							} else {
								p.coins -= price;
								casinoInventory = casinoInventory.filter( function (i) { return i != obj; });
								p.addItem(obj);
								result = user + ": you successfully purchase the " + obj;
							}

						}

					});
					sendMessage({
						to: channelID,
						message: result,
						typing: true
					});
					break;					
				}
			break;

			case 'sell':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **I DON'T MAKE DEALS WITH VERMIN**",
						typing: true
					});
					break;
				} else if (channelID != channels.get("casino")) {
					sendMessage({
						to: channelID,
						message: user + ": nobody here will buy this",
						typing: true
					});
					break;
				} else if (obj == "") {
					sendMessage({
						to: channelID,
						message: user + ": please specify what you want to sell. (!inventory to see what items you have)",
						typing: true
					});
					break;									
				}  else {

					players.forEach (function (p) {
						if (p.id == userID) {
							var price = database.casinoprices[obj] / 2;
							if (!p.hasItem(obj)) {
								result = user + ": you don't own that item (!inventory to see what items you have)";
							} else {
								p.coins += price;
								casinoInventory.push(obj);
								p.removeItem(obj);
								if(p.weapon == obj) {p.weapon = "fists";}
								result = user + ": you successfully sell the " + obj + " for " + price + " coins.";
							}

						}

					});
					casinoInventory = casinoInventory.filter(function(item) {return !animeMerch.includes(item);});
					sendMessage({
						to: channelID,
						message: result,
						typing: true
					});
					break;					
				}

			break;

			case 'equip':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID)) || channelID == trialgrounds.ch || channelID == pokeball.ch || channelID == ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				}

				if (weapons.includes(obj)) {
					if(!players.some(function (p) {return (p.id == userID) && (p.hasItem(obj) || obj == "fists");})) {
						sendMessage({
							to: channelID,
							message: user + ": you don't have that item",
							typing: true
						});
						break;
					}
					players.forEach( function(p) {
						if(p.id == userID) {
							p.equip(obj);
						}

					});
					sendMessage({
						to: channelID,
						message: user + ": equipped the " + obj,
						typing: true
					});
				} else {
					sendMessage({
						to: channelID,
						message: user + ": you can't equip that",
						typing: true
					});
				}

			break;

			case 'wakeup':
				if (isPlayer) {
					activePlayer.distracting = false;
					activePlayer.dancing = false;
				}
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID))) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **THERE'S NO WAKING UP FROM THIS NIGHTMARE**",
						typing: true
					});
					break;
				}
				
				if (channelID != ko.ch) {
					sendMessage({
						to: channelID,
						message: user + ": you're already awake",
						typing: true
					});
					break;

				} else {
					players.forEach( function (p) {
						if (p.id == userID) {
							var time = new Date();
							time = time.getTime();
							var dest;
							knockouts.forEach( function (k) {
								if(k.victim == p.id) {

									time -= k.time;
									dest = k.room;

								}
							});
							if (time > 120000) {
								knockouts = knockouts.filter( function (k) {return k.victim != p.id;} );
								roomEvents = roomEvents.filter( function (e) {return e.id != p.id;} );
								welcomeEvents.push(new RoomEvent(dest, user + ": you regain your senses", userID));
								changeRoom(p.room, rooms.get(dest), dest, p.id);
							} else  {
								sendMessage({
									to: ko.ch,
									message: user + ": you can't wake up yet",
									typing: true
								});
							}
							
						}
					});

				}
			
			break;
			case 'enter':
				if (players.some(function(value) {return value.id == userID;})) {
					if (bossFight) {
						sendMessage({
							to: channelID,
							message: user + ": **YOU'RE ALREADY SUFFERING**",
							typing: true
						});
						break;
					} else {
						sendMessage({
							to: channelID,
							message: user + ": you're already playing!",
							typing: true
						});
					}
				} else if (playing) {
					sendMessage({
						to: channelID,
						message: user + ": game already in progress. you'll have to wait for the next round.",
						typing: true
					});
				} else {
					players.push(new Player(user, userID));
					sendMessage({
						to: channelID,
						message: user + " entered the game",
						typing: true
					});
				}
								
				break;

			case 'players':
				sendMessage({
					to: channelID,
					message: "players:",
					typing: true
				});

				players.forEach(function(value) {
					sendMessage({
						to: channelID,
						message: "<@" + value.id + ">",
						typing: true
					});
				});
				break;
			
			case 'start':
				if(!checkIfPlayer(userID)) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				}
				if(playing) {
					sendMessage({
						to: channelID,
						message: user + ": game already in progress.",
						typing: true
					});
				} else {
					sendMessage({
						to: channelID,
						message: "initializing game",
						typing: true
					});
					var targets = [];
					players.forEach(function(value,index) {targets[index] = players[index];});

					var i;
					for(i = 0; i < 1000; i++) {
						targets.sort(randomSort);
						players.sort(randomSort);
					}
					

					players.forEach(function(value, index) {
						if (index != players.length - 1) {
							while(value.id == targets[targets.length - 1].id) {
								targets.sort(randomSort);
							}
						}
						value.target = targets.pop().id;
					});
					for(i = 0; i < 1000; i++) {
						startingItems.sort(randomSort);
						players.sort(randomSort);
					}
					players.forEach(function(p) {
						if (startingItems.length > 0) {
							p.addItem(startingItems.pop());
							p.coins = 5;
						} else {
							p.coins = 10;
						}

						var i;
						var max = Math.random() * 2 + 4;
						for (i = 0; i < max; i++) {
							var rndm = Math.random();
							if (rndm < 0.35) {
								animePile.push(animeMerch[0]);
							} else if (rndm < 0.6) {
								animePile.push(animeMerch[1]);
							} else if (rndm < 0.75) {
								animePile.push(animeMerch[2]);
							} else if (rndm < 0.87) {
								animePile.push(animeMerch[3]);
							} else if (rndm < 0.95) {
								animePile.push(animeMerch[4]);
							} else {
								animePile.push(animeMerch[5]);
							}
						}

						
					});
					animePile.push("dnd-dice");
					for(i = 0; i < 1000; i++) {
						animePile.sort(randomSort);
					}
					playing = true;
					casinoInventory = casinoInventory.concat(startingItems);

					sendMessage({
						to: channelID,
						message: "you can start playing now (!help for help)",
						typing: true
					});
				}
				
				break;

			case 'target':
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID))) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **YOUR PETTY SQUABBLES DON'T MATTER ANYMORE**",
						typing: true
					});
					break;
				}
				players.forEach(function(value) {
				if (value.id == userID)
				 {sendMessage({
					to: userID,
					message:"your target is <@" +  value.target + ">",
					typing: true
					});}});
				break;

			case 'inventory':
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID))) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				}
				var result = "your inventory holds the following:";
				players.forEach( function(p) {
					
					if (p.id == userID) {
						p.inventory.forEach( function(i) {
							result += "\n" + i + ": " + database.descriptions[i];
						});
					}
				});
				sendMessage({
					to: userID,
					message: result
				});
				break;

			case 'weapon':
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID))) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if( channelID == trialgrounds.id) {
					sendMessage({
						to: channelID,
						message: user + ": you can't check your weapon here",
						typing: true
					});
					break;
				}

				var result = user + ": you have the following weapon equipped:";
				players.forEach( function(p) {
					
					if (p.id == userID) {
							result += "\n" + p.weapon + ": " + database.descriptions[p.weapon];
					}
				});

				sendMessage({
					to: channelID,
					message: result
				});
				break;

			case 'coins':
				if(!(checkIfPlayer(userID) && playing && checkIfAlive(userID))) {
					sendMessage({
						to: channelID,
						message: user + ": you're not authorized to use this command",
						typing: true
					});
					break;
				} else if (bossFight) {
					sendMessage({
						to: channelID,
						message: user + ": **YOUR RICHES ARE WORTHLESS NOW**",
						typing: true
					});
					break;
				}

				var result = user + ": you have ";
				players.forEach( function(p) {
					
					if (p.id == userID) {
							result += p.coins + " coins.";
					}
				});

				sendMessage({
					to: channelID,
					message: result
				});
				break;

			case 'endgame':
				putEveryoneInRoom(channelIDs[4]);
				startingItems = ['codex-astartes', 'nendoroid', 'sburb-beta', 'key', 'pearl'];
				casinoInventory = ['money-machete', 'cash-cannon', 'dollar-bill'];
				animePile = [];
				for (color in magic) {color = false;};

				murders = [];
				knockouts = [];
				roomEvents = [];
				welcomeEvents = [];
				players = [];
				casinoDice = [];
				playing = false;
				voting = false;
				casinoOpen = false;
				arenaRewardsGiven = false;
				bossFight = false;
				boss = new Boss();

				winners = [];
				losers = [];

				sendMessage({
					to: channels.get("lobby"),
					message: "game ended by " + user + "."
				});
				break;

			case 'help':
				sendMessage({
					to: userID,
					message:"Welcome to Happy Turtle Murder Extravaganza. In this game you play an assassin, who has to kill their target without anyone noticing. But watch out, someone else has you as their target, too. After a murder has occurred, everyone gets to vote on who they think did it. If the culprit receives more votes than any other player, they are executed. Otherwise the killer wins and everyone else loses. The game continues, as long as there are at least 4 players left alive, or until a player wins.\n" +
						"Note about weapons: Weapons are single use. You can only kill one person with each weapon. Most weapons will also be automatically left behind at the crime scene for everyone to see.\n" +
						"Note about targets: If you kill someone other than your target, the player who had that target will immediately be notified to receive their substitute target, so avoid unnecessary bloodshed.\n" + 
						"Note about the trial-grounds: The trial-grounds are where you can cast your votes on who you think the culprit was for each case. The trial-grounds are a strict no-combat zone. You are completely safe there. The voting only starts once everyone has entered the trial-grounds. You can go there at any time and from anywhere. However, it's a one-way trip. Once you enter the trial-grounds, you won't be able to leave, until a verdict has been reached.\n" 
				});

				sendMessage({
					to: userID,
					message:"**Game Setup:**\n" +
						"'!help': display this help message\n" +
						"'!enter': enter the game\n" + 
						"'!start': start a game with all entered players\n" +
						"'!players': list all entered players\n" +
						"'!endgame': ends the game for everyone\n" +
						"**Information:**\n" +
						"'!peek <room>': check which players are in an adjacent room.\n" +
						"'!look': shows information about the room you're currently in\n" +
						"'!target': find out who you're supposed to kill\n" +
						"'!inventory': shows what items you are carrying\n" +
						"'!weapon': check which weapon you have equipped\n" +
						"'!coins': check how many coins you have to your name\n" +
						"**Basic Actions:**\n" +
						"'!goto <room>': move to a new room. you can only move to rooms that are adjacent to yours, except for the trial-grounds\n" +
						"'!use <item>': use an item from your inventory\n" +
						"'!equip <weapon>': equip a weapon from your inventory\n" +
						"'!attack <@player>': attack a player with your equipped weapon. only works if you're in the same room with them\n" +
						"'!vote <@player>': cast your vote for who you think the killer is. only works in the trial-grounds"
				});
				break;
			default :
				sendMessage({
					to: channelID,
					message: user + ": I don't recognize that command",
					typing: true
				});

		}
		} else {
			sendMessage({
				to: channelID,
				message: user + ": can't issue commands in this channel",
				typing: true
			});
		}
	} else if (userID == '365975655608745985') { //pokecord id
			if (!arenaRewardsGiven) {

				var embeds = msg.embeds;
				if (embeds == null) {
					return;
				}

				embeds.forEach( function(e) {
					var content = e.description;
					if (content == null) {
						return;
					}
						
					players.forEach( function (p) {
						if (content.includes(p.name + " wins!")) {
							p.addItem("pokeball");
							p.addItem("badge");
							arenaRewardsGiven = true;
							sendMessage({
								to: channelID,
								message: p.name + ": as a reward for your victory in this hard-fought battle you receive the pokeball and the badge."
							});
						}
					});
				});
			}
	}
});


bot.login(auth.token);
