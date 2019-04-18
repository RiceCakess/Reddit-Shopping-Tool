var defaultoptions = 
{
	"updateTime": 360, 
	"labelSketchy":0
};
//to ensure it only loads once
var loaded = false;
$(document).ready(function(){
	//load saved options, or use defaults
	 chrome.storage.local.get({ 
		options: defaultoptions
	 }, function(data) {
		 options = data.options;
		 for (var optionname in data.options){
			if (data.options.hasOwnProperty(optionname)) {
				//set defaults
				$("#" + optionname).val(data.options[optionname]).change();
				//initialize delete button, has to be in callback instead of document.ready
				$(".delete-btn").click(function(){
					$(this).parent().remove();
				});
			}
		}
	});
	initBtn();
	$(".version").html(version);
	$('.changelog').load("changelog.txt");
});
function loadUsers(){
	checkForUpdate();
	chrome.storage.local.get(['users','timestamp'], function(data){
		//loop through banned users
		users = data.users;
		var date = (Date.now() - data.timestamp)/1000; //seconds
		var ago = (Math.floor(date/86400) > 0) ? Math.floor(date/86400) + " days ago" : Math.round(date/3600) + " hours ago";
		$("#lastUpdate").html("Last Updated: " + ago);
		for (var name in users){
			if (users.hasOwnProperty(name)) {
				//add to textarea display
				$(".banned-users").append(document.createTextNode(name + " - " + users[name] + "\r\n"));
				
			}
		}
	});
}
//Initialize all buttons
function initBtn(){
	$("#data-tab").click(function(){
		//load the banned user data list when requested
		if(!loaded){
			loadUsers();
			loaded = true;
		}
	});
	$("#forceupdate").click(function(){
		$(this).text("Updating..");
		$(this).addClass("disabled");
		updateList(function(msg){
			alert(msg);
			$("#forceupdate").text("Force Ban List Update");
			$("#forceupdate").removeClass("disabled");
		});
	});
	$("#setdefault").click(function(){
		chrome.storage.local.set({
			options: defaultoptions
		}, function() {
			//display success message
			var status = $("#status");
			status.html('<div class="alert alert-success">Options Successfully Saved</div>');
			setTimeout(function() {
			  status.html('');
			}, 5000);
		});
		window.location.reload();
	});
	
	$("#save").click(function() {
		var optionset = {};
		//loop through for any options
		$(".rst-option").each(function() {
			//add to options array
			var value = $(this).val();
			var optionname = $(this).attr('id');
			optionset[optionname] = value;
		});
		//save array to chrome sync'd storage
		chrome.storage.local.set({
			options: optionset
		}, function() {
			//display success message and scroll to top
			var status = $("#status");
			status.html('<div class="alert alert-success">Options Successfully Saved</div>');
			$(window).scrollTop(0);
			setTimeout(function() {
			  status.html('');
			}, 5000);
		});
		option = optionset;
	});
}