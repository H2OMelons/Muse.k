var signInButton = document.getElementById("sign-in-button");
var tryAgainButton = document.getElementById("try-again-button");
var noAccountButton = document.getElementById("no-account-button");

var signInFail = 1;
var signInSuccess = 2;
var load = 3;
var tryAgain = 4;
var noAccount = 5;
var interactiveSignin = 6;
var loadedParts = 0;
var maxLoadedParts = 2;

signInButton.onclick = function(){
  //interactiveSignIn();
  //changeState(load);
}

/*noAccountButton.onclick = function(){
  chrome.extension.getBackgroundPage().updateUserAccountStatus("false");
  changeState(noAccount);
}*/

tryAgainButton.onclick = function(){
  //changeState(tryAgain);
}

function changeState(state){
  var loaderUI = document.getElementById("loadAnimation");
  var signinUI = document.getElementById("signin-ui");
  var tryAgainUI = document.getElementById("tryAgain");
  switch(state){
    case signInFail:
      loaderUI.style.display = "none";
      tryAgainUI.style.display = "block";
      break;
      
    case signInSuccess: 
      chrome.storage.sync.set({'account' : "true"}, function(){
        //location.replace("account_main_page.html");
      });
      break;
      
    case load:
      loaderUI.style.display = "block";
      signinUI.style.display = "none";
      break;
      
    case tryAgain:
      tryAgainUI.style.display = "none";
      signinUI.style.display = "block";
      break;
      
    case noAccount:
      //location.replace("no_account_main_page.html");
      break;
      
    case interactiveSignin:
      //location.replace("signin.html");
      break;
      
    default:
      window.alert("Something went wrong. Should never reach this switch case");
  }
}

function interactiveSignIn(){
  chrome.identity.getAuthToken({'interactive' : true}, function(token){
    if(chrome.runtime.lastError){
      chrome.extension.getBackgroundPage().console.log("sign in unsuccessful");
    }
    else{
      chrome.extension.getBackgroundPage().console.log("sign in success");
    }
    
    /*if(chrome.runtime.lastError){
       chrome.identity.getAuthToken({'interactive' : false}, function(token){
        if(chrome.runtime.lastError){
          changeState(signInFail);
        }
        else{
          setUserInfo(token, function(){
            changeState(signInSuccess);
          });   
        }
       });
    }
    else{
      /*setUserInfo(token, function(){
        changeState(signInSuccess);
      }); 
    }*/
  });
}

function revokeToken(){
  chrome.identity.getAuthToken({'interactive' : false}, function(){
    if(!chrome.runtime.lastError){
       chrome.identity.removeCachedAuthToken({token : current_token}, function(){});
      
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://accounts.google.com/o/oauth2/revoke?token=' +
                   current_token);
      xhr.send();
    }
  });
}

function setUserInfo(token, callback){
  //chrome.extension.getBackgroundPage().requestUserInfo({token: token}, function(request){
  //  request.execute(function(response){
      // usage: response.items[0].whatever youre looking for
      //chrome.extension.getBackgroundPage().updateUserAccountStatus("true");
      //chrome.extension.getBackgroundPage().updateUsername(response.items[0].snippet.title);
      //chrome.extension.getBackgroundPage().updateProfileIcon(response.items[0].snippet.thumbnails.default.url);
      //chrome.extension.getBackgroundPage().setPlaylistCount(0);
      //callback();
  //  });
  //});
}