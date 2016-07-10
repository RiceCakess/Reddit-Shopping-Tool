//settings:
//change update duration
//enable/disable neverending
//add/remove subreddit list
var uservis = {};
var options = {};
var version = "1.2.0";
var defaultoptions = 
{
	"updateTime": 1440, 
	"neSupport": 0,
	"subreddits": ["hardwareswap","gameswap", "mechmarket", "hardwareswapaustralia","phoneswap","detailswap","hardwareswapuk","hardwareswapeu","canadianhardwareswap","steamgameswap","avexchange", "trade","ecigclassifieds","borrow", "starcitizen_trades","rotmgtradingpost","care","mynintendotrades","slavelabour","indegameswap","appleswap","redditbay"]
};
$(document).ready(function(){
	//check if website is reddit and not options page
	if (window.location.href.indexOf("reddit") != -1){
		//load options before running rest of script
		chrome.storage.sync.get({
			options: defaultoptions
		 }, function(data) {
				options = data.options;
				checkForUpdate();
				labelUsers();
				checkForChanges();
		});
	}
});
function checkForUpdate(){
	//check last update timestamp
	chrome.storage.local.get(['timestamp','version'], function(data){
		//update list if list is X days old or empty or extension was updated
		if(data.timestamp == null || 
			data.version == null || 
			(options["updateTime"] != -1 &&  (Date.now() - data.timestamp)/1000 > options["updateTime"]*60*1000) ||
			data.version !== version)
		{
			updateList();
		}
	});
}
function labelUsers(){
	//create an array for users that need to be checked
	$( ".author" ).each(function() {
		for(var index in options.subreddits){
			//check if post is from trading subreddits
			if($(this).parents('.thing').attr("data-subreddit") === options.subreddits[index])
				uservis[$(this).text().toLowerCase()] = "";
		}
	});
	chrome.storage.local.get('users', function(data){
		//loop through banned users and check if uservis contains any banned users
		users = JSON.parse(data.users);
		for (var name in users){
			//set as banned if not already on the list
			if (users.hasOwnProperty(name) && uservis[name.toLowerCase()] <= 0) {
				//set the bancode in uservis
				uservis[name.toLowerCase()] = users[name];
			}
		}
		//automoderator exception
		uservis["automoderator"] = "";
		
		//loop through all name tags and set them as banned/sketchy, if any
		$( ".author" ).each(function() {
			//check if user is on the list
			var bancode = uservis[$(this).text().toLowerCase()];
			if(bancode > 0){
				//translate bancode and set it next to thier name 
				$(this).html($(this).text() + " [" + getReasonString(bancode) + "]");
				$(this).addClass("rst-banned-" + bancode);
			}
		});
		
	});
}
function updateList(){
	//grab the ban list page as string
	$.ajax({ 
		url: 'https://www.reddit.com/r/UniversalScammerList/wiki/banlist', 
		success: function(data) {
			//string manipulation to get only names of banned users and reason
			var src = (data.split('<textarea readonly class="source" rows="20" cols="20">')[1]).replace("</textarea>","");
			var users = src.split("*");
			var jusers = {};
			users.forEach(function(entry){
				//split up name and reason and clean up strings
				var reasonsplit = entry.split("#");
				var name = (reasonsplit[0]).trim().replace("/u/","").split(" ");
				var name = name[0];
				var reason = "";
				if(reasonsplit.length > 1){
					reason = ((reasonsplit[1]).split(" "))[0];
				}
				
				if(name != ""){
					var code = 1;
					//1 = scammer or unknown (Default)
					//2 = sketchy
					//3 = troll
					//4 = compromised
					
					//reason check 
					reason = reason.toLowerCase();
					if(reason.includes("sketchy"))
						code = 2;
					else if(reason.includes("troll"))
						code = 3;
					else if(reason.includes("compromised"))
						code = 4;
					else
						code = 1;
					//add to array with bancode
					jusers[name.toLowerCase()] = code;
				}
			});
			//write array, time, and version to local storage
			chrome.storage.local.set({"users" : JSON.stringify(jusers)});
			chrome.storage.local.set({"timestamp" : Date.now()});
			chrome.storage.local.set({"version" : version});
			console.log("Ban List Updated!");
		}
	});
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
			console.log("RES never ending page load detected!");
		}
		//recheck every second
        setTimeout(checkForChanges, 1000);
	}
	else{
		console.log("Never Ending Support disabled! Enable it in the options!");
	}
}
function getReasonString(code){
	//translate bancode
	switch(code){
		case 1: return "SCAMMER"; break;
		case 2: return "SKETCHY"; break;
		case 3: return "TROLL"; break;
		case 4: return "COMPROMISED ACCOUNT"; break;
		default: return "UNKNOWN"; break;
	}
}