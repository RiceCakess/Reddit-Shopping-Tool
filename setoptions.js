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
	chrome.storage.sync.set({
		options: optionset
	}, function() {
		//display success message
		var status = $("#status");
		status.html('<div class="alert alert-success">Options Successfully Saved</div>');
		setTimeout(function() {
		  status.html( '');
		}, 5000);
	});
});
//to ensure it only loads once
var loaded = false;
$("#data-tab").click(function(){
	//load the banned user data list when requested
	if(!loaded){
		loadUsers();
		loaded = true;
	}
});
$("#forceupdate").click(function(){
	updateList();
	alert("Updated");
});
$(document).ready(function(){
	//load saved options, or use defaults
	 chrome.storage.sync.get({
		options: {"updateTime": 1440, "neSupport":0}
	 }, function(data) {
		 for (var optionname in data.options){
			if (data.options.hasOwnProperty(optionname)) {
				//set defaults
				$("#" + optionname).val(data.options[optionname]).change();
			}
			
		}
	});
	
});
function loadUsers(){
	
	chrome.storage.local.get('users', function(data){
		//loop through banned users and check if uservis contains any banned users
		users = JSON.parse(data.users);
		for (var name in users){
			//set as banned if not already on the list
			if (users.hasOwnProperty(name)) {
				//add to textarea display
				$(".banned-users").append(name + " " + getReasonString(users[name]) + "\r\n");
			}
		}
	});
}