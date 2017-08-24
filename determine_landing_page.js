function getAccountData(){
  
  var accountStatus = chrome.extension.getBackgroundPage().getInfo({id:"accountStatus"});
  if(accountStatus == "true"){
    location.replace("account_main_page.html"); 
  }
  else if(accountStatus == "false"){
    location.replace("no_account_main_page.html");
  }
  else{
    location.replace("signin.html");
  }
}

document.addEventListener('DOMContentLoaded', function() {
  getAccountData();
});