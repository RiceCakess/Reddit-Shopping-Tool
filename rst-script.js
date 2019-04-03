var uservis = {};
var options = {};
var version = "1.5.2";
var defaultoptions = 
{
	"updateTime": 360, 
	"neSupport": 1,
	"infobox": 1,
	"labelSketchy":0
};
var lastInfoBox;
$(document).ready(function(){
	//load options before running rest of script
	//console.log(chrome.storage);
	chrome.storage.local.get({
		options: defaultoptions
	 }, function(data) {
		options = data.options;
		if (window.location.hostname.indexOf("reddit.com") != -1 ){
			checkForUpdate();
			labelUsers();
			checkForChanges();
		}
	});
});
function checkForUpdate(){
	//check last update timestamp
	chrome.storage.local.get(['timestamp','version'], function(data){
		//update list if list is X days old or empty or extension was updated
		if(data.timestamp === null || data.version === null || data.version !== version ||
		( options["updateTime"] !== -1 && ( ( Date.now() - data.timestamp )/1000 ) > ( options.updateTime * 60 ) ) ) {
			updateList();
		}
	});
}
function labelUsers(){
	//create an array for users that need to be checked
	$( ".author, .Post__username, .Comment__author, .Post__authorLink, .hrnLZO" ).each(function() {
		if(uservis[$(this).text().toLowerCase()] == null){
			uservis[$(this).text().toLowerCase()] = "";
		}
	});
	chrome.storage.local.get('users', function(data){
		//loop through banned users and check if uservis contains any banned users
		var dbUsers = data.users;
		for (var name in uservis){
			//set as banned if not already on the list
			if (uservis[name.toLowerCase()] <= 0 && dbUsers.hasOwnProperty(name)) {
				//set user info in uservis, and label sketchy users if enabled
				if(options['labelSketchy'] == 1 || dbUsers[name].code != 2){
					uservis[name.toLowerCase()] = dbUsers[name];
				}
			}
		}
		//automoderator exception
		uservis["automoderator"] = "";
		
		//loop through all name tags and set them as banned/sketchy, if any
		$( ".author, .Post__username, .Comment__author, .Post__authorLink, .hrnLZO" ).each(function() {
			
			//check if user is on the list
			var userData = uservis[$(this).text().toLowerCase()];
			if(userData){
				//translate bancode and add badge next to their name
				var badge = $("<a></a>")
				badge.addClass("rst-banned-" + userData.code);
				badge.addClass("rst-badge");
				badge.text(getReasonString(userData.code));
				badge.attr('href',"javascript:;");
				$(this).append(badge);
				
				//if infobox is enabled, append next to name
				if(options['infobox'] == 1){
					var tooltip = $('<span></span>');
					tooltip.addClass("infobox");
					tooltip.text("Reported by: " +  userData.subreddit + "\n\r" + " Reason: " + userData.reason);
					$(this).append(tooltip);
				}
			}
		});
		$(".rst-badge").click(function(){
			//on infobox click, make it visible
			var infobox = $(this).next(".infobox");
			infobox.css("visibility", (infobox.css("visibility") == "hidden") ? "visible" : "hidden");
			
			//make sure that only one infobox is open
			if(lastInfoBox && !(infobox.is(lastInfoBox))){
				lastInfoBox.css("visibility", "hidden"); 
			}
			lastInfoBox = infobox;
		});
	});
}

var sources = [
	"https://old.reddit.com/r/hardwareswap/wiki/banlist",
	"https://old.reddit.com/r/RSTList/wiki/banlist",  
	"https://old.reddit.com/r/RSTList/wiki/sketchylist"
];
function updateList(callback){
	var users = {};
	Promise.all( sources.slice(0, options["labelSketchy"] == 1 ? 3 : 2).map(function( src, index ) {
		return $.get( src );
	})).then(function(res) {
		var msg = "Ban List Updated!";
		$.each(res,function( i, data ){
			if(data)
				$.extend(users, getUsersFromList(data,""));
			else
				msg = "Error, failed to get data";
		});
		chrome.storage.local.set({"users": users});
		chrome.storage.local.set({"timestamp": Date.now()});
		chrome.storage.local.set({"version": version});
		//console.log("[RST] " + msg);
		if( !!callback ) {
			callback(msg);
		}
	});
}
function getUsersFromList(data, defaultSub){
	//string manipulation to get only names of banned users and reason
	var src = (data.split('<textarea readonly class="source" rows="20" cols="20">')[1]).replace("</textarea>","");
	var users = src.split("*");
	var jusers = {};
	users.forEach(function(entry){
		//isolate username
		var userDataSplit = entry.split("#");
		if(name != "" && entry.length < 150 && userDataSplit.length > 1){
			var name = (userDataSplit[0]).trim().replace("/u/","").split(" ");
			var name = name[0];
			
			var code = 1;
			//1 = scammer
			//2 = sketchy
			//3 = troll
			//4 = compromised
			
			//split string into three data points: code, reason, subreddit
			var reason = userDataSplit[1].toLowerCase();
			
			if(reason.includes("sketchy"))
				code = 2;
			else if(reason.includes("troll"))
				code = 3;
			else if(reason.includes("compromise"))
				code = 4;
			else if(reason.includes("scammer"))
				code = 1;
			else
				code = 0;
			
			//clean up everything else in the string, leaving the reason
			var reason = entry.replace(/(#\S+)/gi,"");
			reason = reason.replace("/u/" + name,"");
			var regExp = /\(([^)]+)\)/;
			var match = regExp.exec(reason);
			var subreddit = defaultSub;
			if(match)
				subreddit = match[1].replace("banned by","").trim();
			
			reason = reason.replace(/\(([^)]+)\)/,"").replace("\n","").replace("/", " ").replace("other:","").trim();
			
			//add to array with data
			jusers[name.toLowerCase()] = {code, reason, subreddit};
		}	
	});
	return jusers;
}
//neverending support 
var pagenum = 0;
function checkForChanges()
{
	if(options['neSupport'] == 1){
		//check if a new page marker appeared
		if($('.NERPageMarker').length != pagenum){
			//set all 
			pagenum = $('.NERPageMarker').length;
			labelUsers();
		}
		//recheck every second
        setTimeout(checkForChanges, 1000);
	}
	else{
	console.log("[RST] Never Ending Support disabled! Enable it in the options!");
	}
}
function getReasonString(code){
	//translate bancode
	switch(code){
		case 1: return "SCAMMER"; break;
		case 2: return "SKETCHY"; break;
		case 3: return "TROLL"; break;
		case 4: return "COMPROMISED"; break;
		default: return "UNKNOWN"; break;
	}
}