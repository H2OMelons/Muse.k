var port = chrome.runtime.connect();

const DEFAULT_IMG = -1;
const MQ_DEFAULT_IMG = 0;
const SD_DEFAULT_IMG = 1;
const KEYCODE_ENTER = 13;

var defaultPlaylistImage = "images/default_playlist_img.png";
var i;
var playlistDivImgHeight = "135px";
var playlistDivHeight = "155px";//"100px";
var playlistDivWidth = "240px";//"225px";
var leftMargin = 30;
var topMargin = 100;
var x_spacing = 245;
var y_spacing = 125;

var currPlaylistId;
var editPlaylistId;

var profileIconDiv;
var optionsPageDiv;
var usernameDiv;

var playlistContainer;        // Container that contains all divs pertaining to playlists
var playlistPopup;            // Popup that asks user for a playlist name during creation
var addPlaylistButton;        // Button that user clicks to bring up the popup
var createPlaylistButton;     // Button that actually creates the playlist in the popup
var cancelCreateButton;       // Button that cancels playlist creation in the popup
var playlistInputField;       // Input field that the user enters the playlist name in the popup

var searchInput;
var searchButton;

var homeButton;

var overlay;

var moreOptionsButton;
var moreOptionsPopup;

var playlistPage;
var deletePlaylistPopup;
var playPlaylistButton;
var deletePlaylistPopupConfirmButton;
var deletePlaylistPopupCancelButton;

var videoList;
var addVideoButton;
var addVideoModal;
var videoUrlInput;
var addVideoConfirmButton;
var addVideoCancelButton;

var backgroundPlayer;
var pausedByModal = false;
var pagePlayerStatus;
var backgroundPlayerStatus;

var currVideoId;

var videoBeingPlayed;

var containerToRemove = undefined;
var videoIndexToRemove = undefined;
var settingsIndex = undefined;

var setImageButton;
var currPlaylistLoaded;

var controlLoaded = false;
var controlPlayButton, controlPauseButton, controlRewindButton, controlFastForwardButton,
    controlShuffleButton, controlRepeatButton;
var volumeBar;
var quality;

var importDefault;
var importDefaultContainer;
var importUser;
var importUserContainer;
var importOther;
var importOtherContainer;

var qualityCheck = false;
var pagePlayerReady = false;

var currTime, endTime, timeBar, timeInterval;
var timeSliderDown = false;

var playlistInfo = {playingPlaylist: -1,
                    viewingPlaylist: -1,
                    editingPlaylist: -1,
                    playingPlaylistTag: undefined};

var videoListPlayButtons = [];
var playlistSelectionContainerList = [];

var cancelEvent = new Event("cancel");

var tag = document.createElement('script');



tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);


var modalPlayer = undefined;
var pagePlayer = undefined;
function onYouTubeIframeAPIReady() {
  modalPlayer = new YT.Player('videoModalResultDisplay', {
    playerVars:{
      enablejsapi: 1
    },
    events: {
      'onReady': onModalPlayerReady,
      'onStateChange': onModalPlayerStateChange,
      'onPlaybackQualityChange': onPlaybackQualityChange
    }
  });
  
  var state = chrome.extension.getBackgroundPage().getInfo({id:"playerState"});
  var id = chrome.extension.getBackgroundPage().getCurrVideoId();
  if(state >= 0 && state < 5 && typeof id != "undefined"){
    qualityCheck = true;
    pagePlayer = new YT.Player('player', {
      videoId: id,
      playerVars: {
        "controls": 0,
        "showinfo": 0,
        "disablekb": 1,
        "enablejsapi": 1,
        "modestbranding": 1,
        "rel": 0
      },
      events: {
        'onReady': onPagePlayerReady,
        'onStateChange': onPagePlayerStateChange
      }
    });
  }
  else{
    pagePlayer = new YT.Player('player', {
      playerVars: {
        "controls": 0,
        "showinfo": 0,
        "disablekb": 1,
        "enablejsapi": 1,
        "modestbranding": 1,
        "rel": 0
      },
      events: {
        'onReady': onPagePlayerReady,
        'onStateChange': onPagePlayerStateChange
      }
    });
  }
  
}

function onModalPlayerStateChange(event) {
  if(event.data == YT.PlayerState.PLAYING){
    if(pagePlayer.getPlayerState() == YT.PlayerState.PLAYING ||
       pagePlayer.getPlayerState() == YT.PlayerState.BUFFERING){
      pagePlayer.pauseVideo();
      pausedByModal = true;
    }
  }
  else if(event.data == YT.PlayerState.PAUSED){
    if(pausedByModal){
      pagePlayer.playVideo();
      pausedByModal = false;
    }
  }
  else if(event.data == YT.PlayerState.CUED){
    pausedByModal = false;
  }
  else if(event.data == -1){
    if(pausedByModal){
      pagePlayer.playVideo();   
    }
  }
}

function onPlaybackQualityChange(data){

}

function onPagePlayerStateChange(event){
  
  if(event.data == YT.PlayerState.PLAYING){
    // If page player is waiting for sync, then we do not want to play the video yet
    // Set popup status, pause video, and seek to the beginning and wait for the 
    // background page to finish loading the video
    if(pagePlayerStatus == "waitingForSync"){
      pagePlayer.pauseVideo();
      pagePlayer.seekTo(0);
      stopTimeBar();
      initTimeBar(0, pagePlayer.getDuration());
    }
    else if(pagePlayerStatus == "seeking"){
      pagePlayer.pauseVideo();
      pagePlayerStatus = "ready";
      stopTimeBar();
      initTimeBar(pagePlayer.getCurrentTime(), pagePlayer.getDuration());
    }
    else if(pagePlayerStatus == "userSeeking"){
      chrome.extension.getBackgroundPage().playVideo();
      pagePlayerStatus = "ready";
    }
    else if(pagePlayerStatus == "stopAfterBuffering"){
      pagePlayer.pauseVideo();      
    }
    else{
      stopTimeBar();
      initTimeBar(pagePlayer.getCurrentTime(), pagePlayer.getDuration());
      chrome.extension.getBackgroundPage().playVideo();
      updateControlPanelPlayButton(true);
      if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
        updateVideoListPlayButtons(undefined, chrome.extension.getBackgroundPage().getCurrVideoIndex());
      }
    }
  }
  else if(event.data == YT.PlayerState.PAUSED){

    if(pagePlayerStatus != "waitingForSync"){
      chrome.extension.getBackgroundPage().pauseVideo();
    }
    
    if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
      var index = chrome.extension.getBackgroundPage().getCurrVideoIndex();
      updateVideoListPlayButtons(index, undefined);
    }
    
    updatePlayPlaylistButton(false);
    updateControlPanelPlayButton(false);
  }
  else if(event.data == YT.PlayerState.BUFFERING){
    if(pagePlayerStatus != "waitingForSync"){
      chrome.extension.getBackgroundPage().pauseVideo();
    }
  }
  else if(event.data == YT.PlayerState.ENDED){
    
  }
  else if(event.data == YT.PlayerState.CUED){

  }
  else if(event.data == -1){
    pagePlayer.mute();
  }
}

function loadVideoPreview(videoId){
  modalPlayer.cueVideoById(videoId, 0, quality);
  document.getElementById("videoModalResultDisplay").style.display = "block";
}

function onModalPlayerReady(event){
  
}

function onPagePlayerReady(){
  pagePlayerReady = true;
  if(qualityCheck){
    quality = chrome.extension.getBackgroundPage().getInfo({id:"quality"});
    pagePlayer.setPlaybackQuality(quality);
    qualityCheck = false;
  }
  console.log("page player ready");
}



function initListeners(){
  // Opens a window for the user to add a playlist and closes the window 
  // if clicked again
  addPlaylistButton.onclick = function(){
    displayPlaylistPopup(false, undefined);
  };
  addVideoButton.onclick = function(){
    if(window.getComputedStyle(addVideoModal).display == "none"){
      addVideoModal.style.display = "block";
      overlay.style.display = "block";
      videoUrlInput.focus();
    }
    else{
      addVideoModal.style.display = "none";
      overlay.style.display = "none";
    }
  };
  addVideoConfirmButton.onclick = function(){
    var enteredUrl = videoUrlInput.value;
    var key = "watch?v=";
    var start = enteredUrl.indexOf(key);
    if(start != -1){
      start += key.length;
      var end = start + 11;
      var videoId = enteredUrl.slice(start, end);
      chrome.extension.getBackgroundPage().addVideoToPlaylist(playlistInfo.viewingPlaylist, videoId);
    }
    addVideoCancelButton.click();
  };
  addVideoCancelButton.onclick = function(){
    addVideoModal.style.display = "none";
    videoUrlInput.value = "";
    modalPlayer.stopVideo();
    document.getElementById("videoModalResultDisplay").style.display = "none";
    overlay.style.display = "none";
  };
  videoUrlInput.onkeyup = function(){
    var enteredUrl = videoUrlInput.value;
    var key = "watch?v=";
    var start = enteredUrl.indexOf(key);
    if(start != -1){
      start += key.length;
      var end = start + 11;
      var videoId = enteredUrl.slice(start, end);
      if(videoId.length == 11){
        loadVideoPreview(videoId);
      }
    }
  };
  playlistInputField.onkeyup = function(){
    var numChars = playlistInputField.value.length;
    document.getElementById("playlistTextboxCharCount").innerHTML = numChars + "/50";
  };
  setImageButton.addEventListener("change", function(){
    var file = setImageButton.files[0];
    var reader = new FileReader();
    reader.onloadend = function(){
      document.getElementById("playlistSetImageImage").src = reader.result;  
    }
    if(file){
      reader.readAsDataURL(file);
    }
    else{
      document.getElementById("playlistSetImageImage").src = defaultPlaylistImage;
    }
  }, true);
  
  deletePlaylistPopupCancelButton.onclick = function(){
    overlay.style.display = "none";
    deletePlaylistPopup.style.display = "none";
  };
  
  deletePlaylistPopupConfirmButton.onclick = function(event){
    
    var retVal = chrome.extension.getBackgroundPage().deletePlaylist(playlistInfo.editingPlaylist);
    if(typeof editPlaylistId != "undefined" && 
       (retVal == 1 || retVal == 0)){
      document.getElementById(editPlaylistId).parentNode.removeChild(document.getElementById(editPlaylistId));
      if(playlistInfo.playingPlaylist == playlistInfo.editingPlaylist){
        videoBeingPlayed = undefined;
        currVideoId = undefined;
        playlistInfo.playingPlaylist = -1;
      }
      editPlaylistId = undefined;
      playlistInfo.editingPlaylist = -1;
      
      for(i = 0; i < videoListPlayButtons.length; i++){
        videoListPlayButtons[i].parentNode.parentNode.removeChild(videoListPlayButtons[i].parentNode);
      }
      videoListPlayButtons = [];
      
      deletePlaylistPopup.style.display = "none";
      overlay.style.display = "none";
      
      var playlistSelectionContainer = document.getElementById("playlist-selection-container");
      for(i = 0; i < playlistSelectionContainerList.length; i++){
        playlistSelectionContainerList[i].parentNode.removeChild(playlistSelectionContainerList[i]);
      }
      playlistSelectionContainerList = [];
      setupPlaylistSelectionContainer();
    }
  }
  
  // Clicks the create playlist button when user hits enter key
  searchInput.onkeyup = function(){
    if(event.keyCode == KEYCODE_ENTER){
      searchButton.click();
    }
  };
  
  importDefaultContainer.onkeypress = function(){
    if(event.keyCode == KEYCODE_ENTER){
      createPlaylistButton.click();
    }
  };
  
  searchButton.onclick = function(){
    var keywords = searchInput.value;
    if(keywords.length != 0 && keywords.replace(/\s/g, '').length != 0){
      keywords = keywords.replace(/\s/g, '');
      
      var displayContainer = document.getElementById("search-results-display");
      
      while(displayContainer.firstChild){
        displayContainer.removeChild(displayContainer.firstChild);
      }
      
      chrome.extension.getBackgroundPage().search(keywords, function(item){
        for(i = 0; i < item.items.length; i++){
          createSearchResultDiv(item.items[i]);
        }
      });
    }
  };

  controlPlayButton.onclick = function(){
    if(pagePlayerStatus != "waitingForSync" && 
      (pagePlayer.getPlayerState() == YT.PlayerState.PAUSED ||
       chrome.extension.getBackgroundPage().getInfo({id:"playerState"}) == YT.PlayerState.PAUSED)){
      if(pagePlayer.getPlayerState() != YT.PlayerState.PAUSED){
        chrome.extension.getBackgroundPage().playVideo();
        updateControlPanelPlayButton(true);
      }
      else{
        pagePlayer.playVideo();
      }
    }
  }
  controlPauseButton.onclick = function(){
    if(pagePlayerStatus != "waitingForSync" &&
       (pagePlayer.getPlayerState() == YT.PlayerState.PLAYING ||
        chrome.extension.getBackgroundPage().getInfo({id:"playerState"}) == YT.PlayerState.PLAYING)){
      if(pagePlayer.getPlayerState() != YT.PlayerState.PLAYING){
        chrome.extension.getBackgroundPage().pauseVideo();
        updateControlPanelPlayButton(false);
      }
      else{
        pagePlayer.pauseVideo();
      }
    }
  }
  controlFastForwardButton.onclick = function(){
    if(chrome.extension.getBackgroundPage().getInfo({id:"playerState"}) == YT.PlayerState.PAUSED){
      if(chrome.extension.getBackgroundPage().queueHasNext()){
        updateControlPanelPlayButton(true);
      }
    }
    chrome.extension.getBackgroundPage().playNextInQueue();
  }
  controlRewindButton.onclick = function(){
    chrome.extension.getBackgroundPage().playPrevInQueue();
  }
  
  controlRepeatButton.onclick = function(){
    var repeatOn = chrome.extension.getBackgroundPage().getInfo({id:"repeatStatus"});
    if(repeatOn){
      controlRepeatButton.style.color = "black";
    }
    else{
      controlRepeatButton.style.color = "green"
    }
    chrome.extension.getBackgroundPage().setRepeat(!repeatOn);
  }
  controlShuffleButton.onclick = function(){
    var shuffleOn = chrome.extension.getBackgroundPage().getInfo({id:"shuffleStatus"});
    if(shuffleOn){
      controlShuffleButton.style.color = "black";
    }
    else{
      controlShuffleButton.style.color = "green";
    }
    chrome.extension.getBackgroundPage().setShuffle(!shuffleOn);
  }
  
  document.getElementById("settings-button").onclick = function(){
    if(window.getComputedStyle(document.getElementById("settings-container")).display == "none"){
      document.getElementById("settings-container").style.display = "block";
      document.getElementById("transparent-overlay").style.display = "block";
      if(quality == "small"){
        document.getElementById("smallQualitySelection").style.backgroundColor = "green";
      }
      else if(quality == "medium"){
        document.getElementById("mediumQualitySelection").style.backgroundColor = "green";
      }
      else if(quality == "large"){
        document.getElementById("largeQualitySelection").style.backgroundColor = "green";
      }
      else if(quality == "hd720"){
        document.getElementById("hd720QualitySelection").style.backgroundColor = "green";
      }
      else{
        document.getElementById("defaultQualitySelection").style.backgroundColor = "green";
      }
    }
    else{
      document.getElementById("settings-container").style.display = "none"; 
      document.getElementById("transparent-overlay").style.display = "none";
    }
  }
  
  
  
  document.getElementById("playlist-tab").onclick = function(){
    if(window.getComputedStyle(document.getElementById("playlist-container")).display == "none"){
      document.getElementById("playlist-container").style.display = "block";
      document.getElementById("playlist-tab").style.borderBottom = "none";
      document.getElementById("search-container").style.display = "none";
      document.getElementById("search-tab").style.borderBottom = "1px solid lightgray";
    }
  }
  
  document.getElementById("search-tab").onclick = function(){
    if(window.getComputedStyle(document.getElementById("search-container")).display == "none"){
      document.getElementById("playlist-container").style.display = "none";
      document.getElementById("playlist-tab").style.borderBottom = "1px solid lightgray";
      document.getElementById("search-container").style.display = "block";
      document.getElementById("search-tab").style.borderBottom = "none";
    }
  }
  
/*  playPlaylistButton.onclick = function(){
    if(playPlaylistButton.innerHTML == "Play"){
      var length = chrome.extension.getBackgroundPage().getPlaylistLength(playlistInfo.viewingPlaylist);
      var backgroundPlayerStatus = chrome.extension.getBackgroundPage().getInfo({id:"playerState"});
      // If the current playlist has videos and there are no videos currently playing
      if(length > 0 && backgroundPlayerStatus != YT.PlayerState.PLAYING &&
         backgroundPlayerStatus != YT.PlayerState.BUFFERING){
        if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
          pagePlayer.playVideo();
        }
        else{
          // Set the current playing playlist to be this playlist
          setPlayingPlaylist();
          startPlaylist(-1, playlistInfo.viewingPlaylist);
        }
      }
      else if(length > 0 && 
              (backgroundPlayerStatus == YT.PlayerState.PLAYING ||
               backgroundPlayerStatus == YT.PlayerState.BUFFERING)){
        if(playlistInfo.playingPlaylist != playlistInfo.viewingPlaylist){
          setPlayingPlaylist();
          startPlaylist(-1, playlistInfo.viewingPlaylist);
        }
      }
    }
    else if(playPlaylistButton.innerHTML == "Pause"){
      pagePlayer.pauseVideo();
    }
    else{
      err("playPlaylistButton inner html is spelled wrong");
    }
  }
  */
  volumeBar.onclick = function(e){
    var volume = e.offsetX;

    document.getElementById("volume-bar-fill").style.width = volume + "px";
    // Convert volume to be in range 0-100
    volume = Math.round((volume / 50) * 100);
    //pagePlayer.setVolume(volume);
    chrome.extension.getBackgroundPage().setVolume({"volume": volume, "mute": false});
  }
  
  document.getElementById("volume-on").onclick = function(){
    document.getElementById("volume-on").style.display = "none";
    document.getElementById("volume-off").style.display = "block";
    document.getElementById("volume-bar-fill").style.width = "0px";
    var volume = chrome.extension.getBackgroundPage().getVolume().volume;
    chrome.extension.getBackgroundPage().setVolume({"volume": volume, "mute": true});
  }
  
  document.getElementById("volume-off").onclick = function(){
    document.getElementById("volume-on").style.display = "block";
    document.getElementById("volume-off").style.display = "none";
    var volume = chrome.extension.getBackgroundPage().getVolume().volume;
    chrome.extension.getBackgroundPage().setVolume({"volume": volume, "mute": false});
    document.getElementById("volume-bar-fill").style.width = (volume / 2) + "px";
  }
  
  document.getElementById("smallQualitySelection").onclick = function(){
    if(document.getElementById("smallQualitySelection").style.backgroundColor != "green"){
      document.getElementById(quality+"QualitySelection").style.backgroundColor = "white";
      document.getElementById("smallQualitySelection").style.backgroundColor = "green";
      quality = "small";
      chrome.extension.getBackgroundPage().setQuality("small");
    }
  }
  document.getElementById("mediumQualitySelection").onclick = function(){
    if(document.getElementById("mediumQualitySelection").style.backgroundColor != "green"){
      document.getElementById(quality+"QualitySelection").style.backgroundColor = "white";
      document.getElementById("mediumQualitySelection").style.backgroundColor = "green";
      quality = "medium";
      chrome.extension.getBackgroundPage().setQuality("medium");
    }
  }
  document.getElementById("largeQualitySelection").onclick = function(){
    if(document.getElementById("largeQualitySelection").style.backgroundColor != "green"){
      document.getElementById(quality+"QualitySelection").style.backgroundColor = "white";
      document.getElementById("largeQualitySelection").style.backgroundColor = "green";
      quality = "large";
      chrome.extension.getBackgroundPage().setQuality("large");
    }
  }
  document.getElementById("hd720QualitySelection").onclick = function(){
    if(document.getElementById("hd720QualitySelection").style.backgroundColor != "green"){
      document.getElementById(quality+"QualitySelection").style.backgroundColor = "white";
      document.getElementById("hd720QualitySelection").style.backgroundColor = "green";
      quality = "hd720";
      chrome.extension.getBackgroundPage().setQuality("hd720");
    }
  }
  document.getElementById("defaultQualitySelection").onclick = function(){
    if(document.getElementById("defaultQualitySelection").style.backgroundColor != "green"){
      document.getElementById(quality+"QualitySelection").style.backgroundColor = "white";
      document.getElementById("defaultQualitySelection").style.backgroundColor = "green";
      quality = "default";
      chrome.extension.getBackgroundPage().setQuality("default");
    }
  }
  document.getElementById("sign-in-button").onclick = function(){
    /*chrome.identity.getAuthToken({'interactive' : true}, function(token){
      if(chrome.runtime.lastError){
        chrome.extension.getBackgroundPage().console.log("sign in unsuccessful");
      }
      else{
        chrome.extension.getBackgroundPage().console.log("sign in success");
      }
    });*/
  }
  
  var currSelection = 1;
  importDefault.onmouseenter = function(){
    if(currSelection != 1){
      importDefault.style.borderBottom = "2px solid gray";
    }
  }
  
  importDefault.onmouseleave = function(){
    if(currSelection != 1){
      importDefault.style.borderBottom = "0px";
    }
  }
  
  importDefault.onclick = function(){
    if(currSelection != 1){
      currSelection = 1;
      setImportDisplay({border: "2px solid gray", display: "block"},
                       {border: "0px solid gray", display: "none"},
                       {border: "0px solid gray", display: "none"});
    }
  }
  
  importUser.onmouseenter = function(){
    if(currSelection != 2){
      importUser.style.borderBottom = "2px solid gray";
    }
  }
  
  importUser.onmouseleave = function(){
    if(currSelection != 2){
      importUser.style.borderBottom = "0px solid gray";
    }
  }
  
  importUser.onclick = function(){
    if(currSelection != 2){
      currSelection = 2;
      setImportDisplay({border: "0px solid gray", display: "none"},
                       {border: "2px solid gray", display: "block"},
                       {border: "0px solid gray", display: "none"});
      chrome.identity.getAuthToken({'interactive' : false}, function(token){
        if(chrome.runtime.lastError){
          document.getElementById("signin-ui").style.display = "block";
           /*chrome.identity.getAuthToken({'interactive' : true}, function(token){
            if(chrome.runtime.lastError){
              changeState(signInFail);
            }
            else{
              setUserInfo(token, function(){
                changeState(signInSuccess);
              });   
            }
           });*/
        }
        else{
          //setUserInfo(token, function(){
          //  changeState(signInSuccess);
          //}); 
        }
      });
    }
  }
  
  importOther.onmouseenter = function(){
    if(currSelection != 3){
      importOther.style.borderBottom = "2px solid gray";
    }
  }
  
  importOther.onmouseleave = function(){
    if(currSelection != 3){
      importOther.style.borderBottom = "0px solid gray";
    }
  }
  
  importOther.onclick = function(){
    if(currSelection != 3){
      currSelection = 3;
      setImportDisplay({border: "0px solid gray", display: "none"}, 
                       {border: "0px solid gray", display: "none"}, 
                       {border: "2px solid gray", display: "block"});
    }
  }
  
  function hideModals(){
    var modals = document.getElementsByClassName("modal");
    for(i = 0; i < modals.length; i++){
      if(window.getComputedStyle(modals[i]).display != "none"){
        modals[i].dispatchEvent(cancelEvent);
      }
    }
  }
  
  overlay.onclick = hideModals;
  
  document.getElementById("transparent-overlay").onclick = hideModals;
  
  playlistPopup.addEventListener("cancel", function(){
    cancelCreateButton.click();
  });
  
  addVideoModal.addEventListener("cancel", function(){
    addVideoCancelButton.click();
  });
  
  document.getElementById("settings-container").addEventListener("cancel", function(){
    document.getElementById("settings-button").click();
  });
  
  timeBar.onmousedown = function(){
    timeSliderDown = true;
  }
  
  timeBar.onmouseup = function(){
    timeSliderDown = false; 
    //pagePlayer.seekTo(this.value, true);
    if(pagePlayer.getPlayerState() != -1 && pagePlayer.getVideoUrl() != "https://www.youtube.com/watch"){
      chrome.extension.getBackgroundPage().seekTo(this.value);
      var currMins = Math.floor(this.value / 60);
      var currSecs = Math.floor(this.value % 60);
      if(currSecs < 10){
        currTime.innerHTML = currMins + ":0" + currSecs;
      }
      else{
        currTime.innerHTML = currMins + ":" + currSecs;
      }
    }
    else{
      timeBar.value = 0;
    }
  }
}

function updateTimeBarValue(){
  var currMins = Math.floor(this.value / 60);
  var currSecs = Math.floor(this.value % 60);
  if(currSecs < 10){
    currTime.innerHTML = currMins + ":0" + currSecs;
  }
  else{
    currTime.innerHTML = currMins + ":" + currSecs;
  }
}

/**
 * curr - the time in seconds of where the video currently is
 * end - the total time in seconds that the video lasts
 */
function initTimeBar(curr, end){
  var currMins = Math.floor(curr / 60);
  var currSecs = Math.floor(curr % 60);
  var endMins = Math.floor(end / 60);
  var endSecs = Math.floor(end % 60);
  var currTimeStr = currMins + ":" + currSecs;
  if(currSecs < 10){
    currTimeStr = currMins + ":0" + currSecs;
  }
  var endTimeStr = endMins + ":" + endSecs;
  if(endSecs < 10){
    endTimeStr = endMins + ":0" + endSecs;
  }
  var timeBarLength = ((curr / end) * 100);
  
  currTime.innerHTML = currTimeStr;
  endTime.innerHTML = endTimeStr;
  //timeBar.style.width = timeBarLength + "%";
  timeBar.max = end;
  timeBar.value = curr;
  timeBar.addEventListener("input", updateTimeBarValue);
  
  timeInterval = setInterval(function(){
    if(!timeSliderDown && pagePlayer.getPlayerState() != YT.PlayerState.PAUSED){
      var timeElapsed = pagePlayer.getCurrentTime();
      currMins = Math.floor(timeElapsed / 60);
      currSecs = Math.floor(timeElapsed % 60);
      currTimeStr = currMins + ":" + currSecs;
      if(currSecs < 10){
        currTimeStr = currMins + ":0" + currSecs;
      }
      currTime.innerHTML = currTimeStr;
      timeBarLength = ((timeElapsed / end) * 100);
      //timeBar.style.width = timeBarLength + "%";
      timeBar.value = timeElapsed;
    }
    
  }, 1000);
}

function stopTimeBar(){
  window.clearInterval(timeInterval);
  timeBar.removeEventListener("input", updateTimeBarValue);
}

function setImportDisplay(defaultDisplay, userDisplay, otherDisplay){
  importDefault.style.borderBottom = defaultDisplay.border;
  importDefaultContainer.style.display = defaultDisplay.display;
  importUser.style.borderBottom = userDisplay.border;
  importUserContainer.style.display = userDisplay.display;
  importOther.style.borderBottom = otherDisplay.border;
  importOtherContainer.style.display = otherDisplay.display;
}


var currSearchResultId = undefined;
var selectedSearchResults = undefined;
function createSearchResultDiv(videoInfo){
  var searchResultsContainer = document.createElement("div");
  searchResultsContainer.classList.add("search-results-container");
  var searchResultsTitle = document.createElement("div");
  searchResultsTitle.innerHTML = videoInfo.snippet.title;
  searchResultsTitle.classList.add("search-results-title");
  var searchResultsArtist = document.createElement("div");
  searchResultsArtist.innerHTML = videoInfo.snippet.channelTitle;
  searchResultsArtist.classList.add("search-results-artist", "tiny-font");
  var searchResultsImgContainer = document.createElement("div");
  searchResultsImgContainer.classList.add("search-results-img")
  var searchResultsImg = document.createElement("img");
  searchResultsImg.classList.add("image");
  searchResultsImg.src = videoInfo.snippet.thumbnails.default.url;
  var searchResultOptions = document.createElement("div");
  searchResultOptions.classList.add("search-results-options", "button")
  var addIcon = document.createElement("div");
  addIcon.tag = "i";
  addIcon.classList.add("fa", "fa-plus");
  addIcon.setAttribute("aria-hidden", "true");
  //var playlistSelectionContainer = document.createElement("div");
  //playlistSelectionContainer.classList.add("playlist-selection-container");
  searchResultOptions.appendChild(addIcon);
  searchResultsContainer.appendChild(searchResultsImgContainer);
  searchResultsImgContainer.appendChild(searchResultsImg);
  searchResultsContainer.appendChild(searchResultsTitle);
  searchResultsContainer.appendChild(searchResultsArtist);
  searchResultsContainer.appendChild(searchResultOptions);
  //searchResultsContainer.appendChild(playlistSelectionContainer);
  document.getElementById("search-results-display").appendChild(searchResultsContainer);
  
  searchResultsContainer.onmouseenter = function(){
    if(window.getComputedStyle(document.getElementById("playlist-selection-container")).display == "none"){
      searchResultsContainer.style.backgroundColor = "lightgray";
      searchResultOptions.style.backgroundColor = "lightgray";
      searchResultOptions.style.display = "block";
    }
  }
  searchResultsContainer.onmouseleave = function(){
    if(window.getComputedStyle(document.getElementById("playlist-selection-container")).display == "none"){
      searchResultsContainer.style.backgroundColor = "white";
      searchResultOptions.style.backgroundColor = "white";
      searchResultOptions.style.display = "none";
    }
  }
  addIcon.onclick = function(e){
    currSearchResultId = videoInfo.id.videoId;
    selectedSearchResults = {resultsContainer: searchResultsContainer,
                             resultsOptions: searchResultOptions,
                             addIcon: addIcon};
    if(window.getComputedStyle(document.getElementById("playlist-selection-container")).display == "none"){
      
      var offsetY = e.y - 40;
      if(offsetY + 200 > 470){
        offsetY -= (offsetY + 200 - 470);
      }
      document.getElementById("playlist-selection-container").style.top = offsetY + "px";
      
      var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlistCollection"});
      var playlistSelectionContainer = document.getElementById("playlist-selection-container");
      var numElems = playlistSelectionContainer.childNodes.length;
      
      if(numElems < 2){
        numElems = 2;
      }
      
      for(i = 2; i < numElems && (i - 2 < playlist.length); i++){
        if(playlistSelectionContainer.childNodes[i].innerHTML != playlist[i - 2].name){
          playlistSelectionContainer.childNodes[i].innerHTML = playlist[i - 2].name;
        }
      }
      
      for(i = numElems - 2; i < playlist.length; i++){
        var playlistDiv = document.createElement("div");
        playlistDiv.id = i;
        playlistDiv.classList.add("playlist-selection-container-div", "button");
        playlistDiv.innerHTML = playlist[i].name;
        playlistSelectionContainer.appendChild(playlistDiv);
        playlistDiv.onclick = function(e){
          playlistSelectionContainer.style.display = "none";
          chrome.extension.getBackgroundPage().addVideoToPlaylist(parseInt(e.path[0].id), currSearchResultId);
          var videoDisplay = document.getElementById("playlist-display").childNodes[parseInt(e.path[0].id)].childNodes[1];
          var numVideos = parseInt(videoDisplay.innerHTML.substr(0, videoDisplay.innerHTML.indexOf("V") - 1)) + 1;
          videoDisplay.innerHTML = numVideos + " Videos";
        }
      }
      
      document.getElementById("playlist-selection-container").style.display = "block";
    }
    else{
      document.getElementById("playlist-selection-container").style.display = "none";
      
    }
  }
}

function displayPlaylistPopup(edit, playlistIndex){
  playlistPopup.style.display = "block"; 
  overlay.style.display = "block";
  playlistInputField.focus();
  if(edit){
    var playlist = chrome.extension.getBackgroundPage().getPlaylist(playlistIndex); 
    if(typeof playlist != "undefined" && playlist.videos.length > 0 && playlist.image.slice(-31) == defaultPlaylistImage){
      document.getElementById("playlistSetImageImage").src = 
        "https://img.youtube.com/vi/"+playlist.videos[0].videoId+"/mqdefault.jpg";
    }
    else{
      document.getElementById("playlistSetImageImage").src = playlist.image;
    }
    playlistInputField.value = playlist.name;
    importUser.style.display = "none";
    importOther.style.display = "none";
    createPlaylistButton.addEventListener("click", editPlaylistCreate);
    cancelCreateButton.addEventListener("click", addPlaylistCancel);
  }
  else{
    document.getElementById("playlistSetImageImage").src = defaultPlaylistImage;
    createPlaylistButton.addEventListener("click", addPlaylistCreate);
    cancelCreateButton.addEventListener("click", addPlaylistCancel);
  }
}

function editPlaylistCreate(){
  var name = playlistInputField.value;
  var image = document.getElementById("playlistSetImageImage").src;
  var playlistUpdated = false;
  if(name != currPlaylistLoaded.name){
    playlistUpdated = true;
    currPlaylistLoaded.name = name;
    document.getElementById(editPlaylistId).childNodes[0].innerHTML = name;
  }
  if(image != currPlaylistLoaded.image && currPlaylistLoaded.videos.length > 0 &&
     image != "https://img.youtube.com/vi/"+currPlaylistLoaded.videos[0].videoId+"/mqdefault.jpg"){
    playlistUpdated = true;
    currPlaylistLoaded.image = image;
    currPlaylistLoaded.usingDefaultImage = false;
    if(document.getElementById("player-image-image")){
      document.getElementById("player-image-image").src = image;
    }
    
    document.getElementById(editPlaylistId).childNodes[0].childNodes[0].src = image;
  }
  if(playlistUpdated){
    chrome.extension.getBackgroundPage().updatePlaylist(currPlaylistLoaded, playlistInfo.editingPlaylist);
  }
  /*
  playlistPopup.style.display = "none";
  playlistInputField.value = "New Playlist";
  overlay.style.display = "none";
  createPlaylistButton.removeEventListener("click", editPlaylistCreate);
  cancelCreateButton.removeEventListener("click", addPlaylistCancel);
  */
  cancelCreateButton.click();
}

function addPlaylistCreate(){
  var userInput = playlistInputField.value;
  var image = document.getElementById("playlistSetImageImage").src;
  var usingDefaultImage = (image.slice(-defaultPlaylistImage.length) == defaultPlaylistImage);
  addPlaylistDiv(userInput, image, usingDefaultImage, undefined);
  cancelCreateButton.click();
}

function addPlaylistCancel(){
  playlistPopup.style.display = "none";
  playlistInputField.value = "New Playlist";
  overlay.style.display = "none";
  importUser.style.display = "block";
  importOther.style.display = "block";
  createPlaylistButton.removeEventListener("click", addPlaylistCreate);
  createPlaylistButton.removeEventListener("click", editPlaylistCreate);
  cancelCreateButton.removeEventListener("click", addPlaylistCancel);
}




var videoIndexes = []; // Array to keep track of the indexes of the videos for when users want to delete videos from playlists
function displayPlaylistVideoThumbnails(playlist){
  var videos = playlist.videos;
  var numDeletedVideos = 0;
  if(videos.length > 0){
    for(i = 0; i < videos.length; i++){
      if(videos[i] != -1){
        videoIndexes.push(i - numDeletedVideos);
        createVideoDiv(videos[i], i - numDeletedVideos);
      }
      else{
        numDeletedVideos++;
      }
    }  
    
    if(numDeletedVideos > 0){
      chrome.extension.getBackgroundPage().cleanVideoArray(playlistInfo.viewingPlaylist);
    }
  }
  else{

  }  
}

function startPlaylist(startingVideo, playlistIndex){
  var length = chrome.extension.getBackgroundPage().getPlaylistLength(playlistIndex);
  var shuffleOn = chrome.extension.getBackgroundPage().getInfo({id:"shuffleStatus"});
  if(startingVideo == -1 && shuffleOn){
    startingVideo = Math.floor(Math.random() * length); 
  }
  else if(startingVideo == -1 && !shuffleOn){
    startingVideo = 0;
  }
  
  chrome.extension.getBackgroundPage().initQueue(startingVideo, playlistIndex);
  if(typeof videoBeingPlayed == "undefined"){
    var index = chrome.extension.getBackgroundPage().getCurrVideoIndex();
    var list = document.getElementById("videos");
    var listChildren = list.childNodes;
    videoBeingPlayed = listChildren[index].childNodes[0];
  }
  
  var queue = chrome.extension.getBackgroundPage().getQueue();

  if(shuffleOn){
    setupVideo(queue.playlist[queue.current].video, undefined, queue.playlist[queue.current].index);
  }
  else{
    setupVideo(queue.playlist[queue.current].video, undefined, queue.playlist[queue.current].index);
  }
}

function createVideoDiv(video, index){
  var currPlaylistInfo = chrome.extension.getBackgroundPage().getPlaylistInfo();
  var videoIndex = chrome.extension.getBackgroundPage().getCurrVideoIndex();
  var container = document.createElement("div");
  container.classList.add("videoList", "container", "botBorder", "video");

  var playButton = document.createElement("div");
  playButton.classList.add("videoList", "imageContainer");

  var play = document.createElement("div");
  play.tag = "i";
  play.classList.add("fa", "fa-play-circle-o", "fa-lg", "video-image-container");
  play.setAttribute("aria-hidden", "true");
  
  var pause = document.createElement("div");
  pause.tag = "i";
  pause.classList.add("fa", "fa-pause-circle-o", "fa-lg", "video-image-container");
  pause.setAttribute("aria-hidden", "true");
  
  playButton.appendChild(play);
  playButton.appendChild(pause);
  
  if(videoIndex == index && playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
    if(chrome.extension.getBackgroundPage().getInfo({id:"playerState"}) == YT.PlayerState.PLAYING){
      play.style.display = "none";
      pause.style.display = "block";
    }
    else{
      play.style.display = "block";
      pause.style.display = "none";
    }
    videoBeingPlayed = playButton;
  }
  else{
    play.style.display = "block";
    pause.style.display = "none";
  }
  
  play.onclick = function(){
    setPlayingPlaylist();
    if(typeof videoBeingPlayed != "undefined"){
      // If another video is currently playing then change the button status
      videoBeingPlayed.childNodes[0].style.display = "block";
      videoBeingPlayed.childNodes[1].style.display = "none";
    }
    if(videoBeingPlayed == this.parentNode && pagePlayer.getPlayerState() == YT.PlayerState.PAUSED){
      pagePlayer.playVideo();  
    }
    else{
      startPlaylist(index, playlistInfo.viewingPlaylist);
      videoBeingPlayed = playButton;
    }
    play.style.display = "none";
    pause.style.display = "block";
  };
  
  pause.onclick = function(){
    if(pagePlayer.getPlayerState() == YT.PlayerState.BUFFERING){
      play.style.display = "block";
      pause.style.display = "none";
      pagePlayerStatus = "stopAfterBuffering";
    }
    else{
      pagePlayer.pauseVideo();
    }
  }
  
  videoListPlayButtons.push(playButton);
  
  var title = document.createElement("div");
  title.classList.add("videoList", "titleContainer");
  title.innerHTML = video.videoTitle;
  title.onclick = function(){
    if(window.getComputedStyle(play).display == "none"){
      pause.click();
    }
    else{
      play.click();
    }
  }
  var channel = document.createElement("div");
  channel.classList.add("videoList", "channelContainer");
  channel.innerHTML = video.channelTitle;
  channel.onclick = function(){
    if(window.getComputedStyle(play).display == "none"){
      pause.click();
    }
    else{
      play.click();
    }
  }
  var duration = document.createElement("div");
  duration.classList.add("videoList", "durationContainer");
  var start = video.duration.indexOf("PT") + 2;
  var end = video.duration.indexOf("M");
  var min = video.duration.slice(start, end);
  var sec = video.duration.slice(end + 1, video.duration.indexOf("S"));
  if(sec.length == 1){
    sec = "0" + sec;
  }
  duration.innerHTML = min + ":" + sec;
  var settings = document.createElement("div");
  settings.classList.add("video-settings");
  settings.id = "videoSettings";
  var img = document.createElement("img");
  img.classList.add("image");
  img.src = "images/settings-cog.png";
  
  settings.appendChild(img);

  var settingsModal = document.createElement("div");
  settingsModal.classList.add("video-settings-modal");
  var deleteButton = document.createElement("div");
  deleteButton.classList.add("small-square-button", "left-align", "button");
  var deleteButtonImg = document.createElement("div");
  deleteButtonImg.tag = "i";
  deleteButtonImg.setAttribute("aria-hidden", "true");
  deleteButtonImg.classList.add("fa", "fa-trash-o");
  deleteButton.appendChild(deleteButtonImg);
  var editButton = document.createElement("div");
  editButton.classList.add("small-square-button", "right-align", "button");
  var editButtonImg = document.createElement("div");
  editButtonImg.classList.add("fa", "fa-pencil-square-o");
  editButton.style.top = "2px";
  editButton.appendChild(editButtonImg);
  settingsModal.appendChild(deleteButton);
  settingsModal.appendChild(editButton);
  
  
  
  settings.onclick = function(){
    if(window.getComputedStyle(settingsModal).opacity == "0"){
      settingsModal.style.opacity = "1";
      settingsIndex = index;
      containerToRemove = container;
      videoIndexToRemove = index;
      deleteButton.addEventListener("click", removeVideo);
      editButton.addEventListener("click", editVideo);
    }
    else{
      settingsModal.style.opacity = "0";
      if(settingsIndex == index){
        containerToRemove = undefined;
        videoIndexToRemove = undefined;
      }
      else{
        settingsIndex = index;
        videoIndexToRemove = index;
        containerToRemove = container;
      }
    }
  }
  
  container.appendChild(playButton);
  container.appendChild(title);
  container.appendChild(channel);
  container.appendChild(duration);
  container.appendChild(settings);
  container.appendChild(settingsModal);
  
  container.onmouseenter = function(){
    settings.style.opacity = "1";
  }
  
  container.onmouseleave = function(){
    settings.style.opacity = "0";
    if(window.getComputedStyle(settingsModal).opacity == "1"){
      settingsModal.style.opacity = "0";
    }
  }

  videoList.appendChild(container);
}

function removeVideo(){
  var length = chrome.extension.getBackgroundPage().getPlaylistLength(playlistInfo.viewingPlaylist);
  if(length == 1){
    if(!chrome.extension.getBackgroundPage().getPlaylistUsingDefaultImage(playlistInfo.viewingPlaylist)){
      document.getElementById("player-image-image").src = defaultPlaylistImage;
      document.getElementById("playlistList").childNodes[playlistInfo.viewingPlaylist].childNodes[0].childNodes[0].src = defaultPlaylistImage
    }
  }
  
  // Find the first available videoListPlayButton
  var firstAvailableIndex = -1;
  for(i = 0; i < videoListPlayButtons.length && firstAvailableIndex == -1; i++){
    if(videoListPlayButtons[i] != null){
      firstAvailableIndex = i;
    }
  }
  
  chrome.extension.getBackgroundPage().deleteVideo(videoIndexToRemove, playlistInfo.viewingPlaylist);
  
  if(firstAvailableIndex != -1 && firstAvailableIndex == videoIndexToRemove){
    updatePlayistPageImage();
    updatePlaylistDivImage(playlistInfo.viewingPlaylist);
  }
  
  if(playlistInfo.playingPlaylist != playlistInfo.viewingPlaylist){
    videoListPlayButtons.splice(videoIndexToRemove, 1);
  }
  else{
    videoListPlayButtons[videoIndexToRemove] = null;
  }
  
  //document.getElementById("deleteVideoButton").removeEventListener("click", removeVideo);
  containerToRemove.parentNode.removeChild(containerToRemove);
  var videoDisplay = document.getElementById("playlist-display").childNodes[playlistInfo.viewingPlaylist].childNodes[1];
  var numVideos = chrome.extension.getBackgroundPage().getNumVideos(playlistInfo.viewingPlaylist);
  videoDisplay.innerHTML = numVideos + " Videos";
  //document.getElementById("video-settings-modal").style.display = "none";
  videoIndexToRemove = undefined;
  containerToRemove = undefined;
  
}

function editVideo(){
  overlay.style.display = "block";
  var video = chrome.extension.getBackgroundPage().getInfo({id:"video",               
                                                            playlistNumber:playlistInfo.viewingPlaylist,
                                                            videoNumber:videoIndexToRemove});
  var editVideoDiv = document.createElement("div");
  editVideoDiv.style.position = "absolute";
  editVideoDiv.style.border = "1px solid black";
  editVideoDiv.style.width = "500px";
  editVideoDiv.style.height = "350px";
  editVideoDiv.style.top = "100px";
  editVideoDiv.style.left = "125px";
  editVideoDiv.style.backgroundColor = "white";
  editVideoDiv.style.zIndex = "1000";
  editVideoDiv.classList.add("modal");
  var titleText = document.createElement("div");
  titleText.innerHTML = "Title";
  titleText.style.position = "absolute";
  titleText.style.top = "10px";
  titleText.style.left = "25px";
  var titleInput = document.createElement("input");
  titleInput.style.position = "absolute";
  titleInput.style.border = "1px solid black";
  titleInput.style.width = "300px";
  titleInput.style.height = "25px";
  titleInput.style.top = "30px";
  titleInput.style.left = "25px";
  titleInput.value = video.videoTitle;
  titleInput.maxlength = 100;
  var artistText = document.createElement("div");
  artistText.innerHTML = "Artist";
  artistText.style.position = "absolute";
  artistText.style.top = "80px";
  artistText.style.left = "25px";
  var artistInput = document.createElement("input");
  artistInput.style.position = "absolute";
  artistInput.style.border = "1px solid black";
  artistInput.style.height = "25px";
  artistInput.style.width = "300px";
  artistInput.style.top = "100px";
  artistInput.style.left = "25px";
  artistInput.value = video.channelTitle;
  artistInput.maxlength = 100;
  var cancelButton = document.createElement("div");
  cancelButton.style.position = "absolute";
  cancelButton.style.border = "1px solid black";
  cancelButton.style.height = "30px";
  cancelButton.style.width = "75px";
  cancelButton.style.top = "300px";
  cancelButton.style.left = "150px";
  cancelButton.innerHTML = "Cancel";
  cancelButton.onclick = function(){
    document.body.removeChild(editVideoDiv);
    containerToRemove = undefined;
    videoIndexToRemove = undefined;
    settingsIndex = undefined;
    overlay.style.display = "none";
  }
  cancelButton.classList.add("button");
  var confirmButton = document.createElement("div");
  confirmButton.style.position = "absolute";
  confirmButton.style.border = "1px solid black";
  confirmButton.style.height = "30px";
  confirmButton.style.width = "75px";
  confirmButton.style.top = "300px";
  confirmButton.style.left = "250px";
  confirmButton.innerHTML = "Confirm";
  confirmButton.onclick = function(){
    containerToRemove.childNodes[1].innerHTML = titleInput.value;
    containerToRemove.childNodes[2].innerHTML = artistInput.value;
    chrome.extension.getBackgroundPage().editVideo(titleInput.value, 
                                                   artistInput.value, 
                                                   videoIndexes[videoIndexToRemove], 
                                                   playlistInfo.viewingPlaylist);
    document.body.removeChild(editVideoDiv);
    containerToRemove = undefined;
    videoIndexToRemove = undefined;
    settingsIndex = undefined;
    overlay.style.display = "none";
  }
  confirmButton.classList.add("button");
  editVideoDiv.appendChild(titleInput);
  editVideoDiv.appendChild(titleText);
  editVideoDiv.appendChild(artistInput);
  editVideoDiv.appendChild(artistText);
  editVideoDiv.appendChild(cancelButton);
  editVideoDiv.appendChild(confirmButton);
  
  editVideoDiv.onkeypress = function(){
    if(event.keyCode == KEYCODE_ENTER){
      confirmButton.click();
    }
  };
  
  editVideoDiv.addEventListener("cancel", function(){
    cancelButton.click();
  })
  
  document.body.appendChild(editVideoDiv);
  titleInput.focus();
}

function createPlaylistDiv(playlistObj){
  var numPlaylists = chrome.extension.getBackgroundPage().getInfo({id:"playlistCount"});
  var name, index, pic;
  
  if(playlistObj.containsPlaylist){
    name = playlistObj.playlist.name;
    index = playlistObj.index;
    pic = chrome.extension.getBackgroundPage().getPlaylistImage(index, MQ_DEFAULT_IMG);
  }
  else{
    name = playlistObj.name;
    index = numPlaylists;
    pic = playlistObj.image;
  }
  var div = document.createElement("div");
  var tag = "Playlist " + index + ":" + name;
  div.id = tag;
  div.classList.add("border-bottom", "playlist-div", "button");
  
  var imgContainer = document.createElement("div");
  imgContainer.classList.add("image","playlist-div-image");
  var img = document.createElement("img");
  img.src = pic;
  img.style.height = "50px";
  var titleContainer = document.createElement("div");
  titleContainer.classList.add("regular-font", "playlist-div-info");
  var infoContainer = document.createElement("div");
  infoContainer.classList.add("tiny-font", "playlist-div-info");
  if(playlistObj.containsPlaylist){
    titleContainer.innerHTML = playlistObj.playlist.name;
    infoContainer.innerHTML = playlistObj.numVideos+ " Videos";
  }
  else{
    titleContainer.innerHTML = playlistObj.name;
    
    if(typeof playlistObj.videos != "undefined"){
      infoContainer.innerHTML = playlistObj.videos.length + " Videos";  
    }
    else{
      infoContainer.innerHTML = "0 Videos";
    }
  }
  infoContainer.style.lineHeight = "150%";
  
  div.onclick = function(e){
    if(e.clientX < 290){
      if(index != playlistInfo.viewingPlaylist){

        for(i = 0; i < videoListPlayButtons.length; i++){
          if(videoListPlayButtons[i] != null){
            videoListPlayButtons[i].parentNode.parentNode.removeChild(videoListPlayButtons[i].parentNode);
          }
        }

        videoListPlayButtons = [];

        currPlaylistId = tag;
        playlistInfo.viewingPlaylist = index;
        loadPlaylistPage(playlistInfo.viewingPlaylist);
      } 
    }
    else{
      var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlist", playlistNumber: index});
      editPlaylistId = tag;
      playlistInfo.editingPlaylist = index;
      currPlaylistLoaded = playlist;
    }
  }
  imgContainer.appendChild(img);
  
  var settings = document.createElement("div");
  settings.classList.add("playlist-settings", "list-group");
  var deleteContainer = document.createElement("div");
  deleteContainer.classList.add("list-group-item");
  var deleteButtonImg = document.createElement("div");
  deleteButtonImg.tag = "i";
  deleteButtonImg.classList.add("fa", "fa-trash-o", "fa-fw");
  deleteButtonImg.setAttribute("aria-hidden", "true");
  deleteContainer.appendChild(deleteButtonImg);
  var deleteButtonText = document.createElement("div");
  deleteButtonText.style.right = "5px";
  deleteButtonText.innerHTML = "Delete";
  deleteButtonText.style.position = "absolute";
  deleteButtonText.style.top = "0";
  deleteContainer.appendChild(deleteButtonText);
  settings.appendChild(deleteContainer);
  deleteContainer.onclick = function(){
    if(window.getComputedStyle(deletePlaylistPopup).display == "none"){
      overlay.style.display = "block";
      deletePlaylistPopup.style.display = "block"; 
    }
    else{
      overlay.style.display = "none";
      deletePlaylistPopup.style.display = "none";
    }
  };
  
  var editContainer = document.createElement("div");
  editContainer.classList.add("list-group-item");
  var editButtonImg = document.createElement("div");
  editButtonImg.tag = "i";
  editButtonImg.classList.add("fa", "fa-pencil-square-o", "fa-fw");
  editButtonImg.setAttribute("aria-hidden", "true");
  editContainer.appendChild(editButtonImg);
  var editButtonText = document.createElement("div");
  editButtonText.style.right = "18px";
  editButtonText.innerHTML = "Edit";
  editButtonText.style.position = "absolute";
  editButtonText.style.top = "20px";
  editContainer.appendChild(editButtonText);
  settings.appendChild(editContainer);
  
  editContainer.onclick = function(e){
    var start = "Playlist ".length;
    var playlistNum = 0;
    for(i = 0; i < e.path.length; i++){
      if(e.path[i].id.includes("Playlist")){
        var end = e.path[i].id.indexOf(":");
        playlistNum = parseInt(e.path[i].id.slice(start, end))
        i = e.path.length + 1;
      }
    }
    displayPlaylistPopup(true, playlistNum);
  }
  
  div.onmouseenter = function(){
    settings.style.opacity = "1";
  }
  
  div.onmouseleave = function(){
    settings.style.opacity = "0";
  }
  
  div.appendChild(titleContainer);
  div.appendChild(infoContainer);
  div.appendChild(settings);
  document.getElementById("playlist-display").appendChild(div);
  
}

function addPlaylistDiv(name, image, usingDefaultImage, videos){
  var uid = new Date().getTime().toString();
  createPlaylistDiv({containsPlaylist: false, name: name, image:image, videos: videos});
  var videoCollection = [];
  if(typeof videos != "undefined"){
    videoCollection = videos;
  }
  var playlistObj = {
    name: name,
    image: image,
    usingDefaultImage: usingDefaultImage,
    videos: videoCollection,
    uid: uid,
  };
  chrome.extension.getBackgroundPage().addPlaylist(playlistObj);
}

function displayPlaylists(){
  var numPlaylists = chrome.extension.getBackgroundPage().getInfo({id:"playlistCount"});
  var playlistCollection = chrome.extension.getBackgroundPage().getInfo({id:"playlistCollection"});
  for(i = 0; i < numPlaylists; i++){
    var numVideos = chrome.extension.getBackgroundPage().getNumVideos(i);
    var obj = {containsPlaylist: true,
               playlist: playlistCollection[i],
               numVideos: numVideos,
               index: i};
    //createPlaylistDiv({containsPlaylist: true, playlist: playlistCollection[i], index: i});
    createPlaylistDiv(obj);
  }
}

function loadPlayerState(){
  var state = chrome.extension.getBackgroundPage().getInfo({id:"playerState"});
  if(state > 0 && state < 5){
    var queue = chrome.extension.getBackgroundPage().getQueue();
    
    if(state != 2){
      controlPlayButton.style.display = "none";
      controlPauseButton.style.display = "block";
    }
    else{
      controlPlayButton.style.display = "block";
      controlPauseButton.style.display = "none";
    }
    playlistInfo = chrome.extension.getBackgroundPage().getPlaylistInfo();
    if(playlistInfo.playingPlaylist != typeof "undefined" && playlistInfo.playingPlaylist != -1){
      loadPlaylistPage(playlistInfo.playingPlaylist);
    }
  }
  quality = chrome.extension.getBackgroundPage().getInfo({id:"quality"});
}

/**
 * Loads the user's profile icon and username
 */
function loadUserInfo(){
  var image = document.createElement("IMG");
  image.id = "profileIconDivImage"
  image.src = chrome.extension.getBackgroundPage().getInfo({id:"profileIcon"});
  image.style.borderRadius = "100%";
  image.style.width="35px";
  profileIconDiv.appendChild(image);
  usernameDiv.innerHTML = chrome.extension.getBackgroundPage().getInfo({id:"username"});
}

function loadDivs(){
  addPlaylistButton = document.getElementById("add-playlist-button");
  addVideoButton = document.getElementById("add-video-button");
  addVideoModal = document.getElementById("addVideoModal");
  addVideoCancelButton = document.getElementById("addVideoCancelButton");
  addVideoConfirmButton = document.getElementById("addVideoConfirmButton");
  
  playlistPopup = document.getElementById("playlistPopup");
  createPlaylistButton = document.getElementById("createPlaylistButton");
  cancelCreateButton = document.getElementById("cancelPlaylistCreateButton");
  
  playlistInputField = document.getElementById("playlistInput");
  searchInput = document.getElementById("searchInput");
  searchButton = document.getElementById("searchButton");
  deletePlaylistPopup = document.getElementById("deletePlaylistPopup");
  deletePlaylistPopupCancelButton = document.getElementById("deletePlaylistPopupCancelButton");
  deletePlaylistPopupConfirmButton = document.getElementById("deletePlaylistPopupConfirmButton");
  overlay = document.getElementById("overlay");
  videoList = document.getElementById("videos");
  
  
  videoUrlInput = document.getElementById("urlInput");
  
  playPlaylistButton = document.getElementById("playPlaylistButton");
  setImageButton = document.getElementById("playlistSetImageButton");
  controlPlayButton = document.getElementById("control-play-button");
  controlPauseButton = document.getElementById("control-pause-button");
  controlRewindButton = document.getElementById("control-rewind-button");
  controlFastForwardButton = document.getElementById("control-fast-forward-button");
  controlRepeatButton = document.getElementById("control-repeat-button");
  controlShuffleButton = document.getElementById("control-shuffle-button");
  volumeBar = document.getElementById("volume-bar");
  
  importDefault = document.getElementById("import-default-playlist");
  importDefaultContainer = document.getElementById("import-default-playlist-container");
  importUser = document.getElementById("import-your-playlist");
  importUserContainer = document.getElementById("import-your-playlist-container");
  importOther = document.getElementById("import-other-playlist");
  importOtherContainer = document.getElementById("import-other-playlist-container");
  
  currTime = document.getElementById("control-time-curr");
  endTime = document.getElementById("control-time-end");
  timeBar = document.getElementById("control-time-bar");
}

/**
 * After a user clicks on a playlist, load the page associated with that playlist
 * 1. Load the current video being played. If none load the playlist image
 * 2. Hide the page containing the playlists
 * 3. Unhide the playlist page
 * 3. Load the description 
 * 4. Load the videos in the playlist
 * Information that needs to be set when loading playlist page
 * 1. The current playlist number on this page and background page
 */

function loadPlaylistPage(playlistNumber){
  
  if(window.getComputedStyle(document.getElementById("video-bar")).display == "none"){
    document.getElementById("video-bar").style.display = "block";
  }
  
  // Get info about the current video being played from the background page
  var playlistLength = chrome.extension.getBackgroundPage().getQueueLength();
  var backgroundPlayerState = chrome.extension.getBackgroundPage().getInfo({id: "playerState"});
  
  var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlist", playlistNumber: playlistNumber});
  currPlaylistLoaded = playlist;
  
  if(typeof playlist != "undefined"){
    chrome.extension.getBackgroundPage().setCurrPlaylistPage(playlistNumber);
    var videos = playlist.videos;
    var state = playlistLength > 0 && (backgroundPlayerState >= 0 && backgroundPlayerState < 5);
                //&& (playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist);
    if(state){
      if(window.getComputedStyle(document.getElementById("player")).display != "block"){
        document.getElementById("player").style.display = "block";
        document.getElementById("playerImage").style.display = "none";
        var playerState = chrome.extension.getBackgroundPage().getInfo({id:"playerState"});
        if(playerState == YT.PlayerState.PLAYING &&
           pagePlayer.getPlayerState() != YT.PlayerState.PLAYING){
          pagePlayer.seekTo(chrome.extension.getBackgroundPage().getCurrentTime());    
        }
        else if(playerState == YT.PlayerState.PLAYING &&
                pagePlayer.getPlayerState() == YT.PlayerState.PLAYING){

        }
        else if(playerState == YT.PlayerState.PAUSED && 
                pagePlayer.getPlayerState() == YT.PlayerState.PAUSED){

        }
        else if(playerState >= 0 && playerState < 5){
          pagePlayerStatus = "seeking";
          pagePlayer.seekTo(chrome.extension.getBackgroundPage().getCurrentTime());
        }
        setPlayingPlaylist();
      }
    }
    else{
      var img = document.getElementById("player-image-image");
      img.src = chrome.extension.getBackgroundPage().getPlaylistImage(playlistNumber, SD_DEFAULT_IMG);
      document.getElementById("player").style.display = "none";
      document.getElementById("playerImage").style.display = "block";
    }
    displayPlaylistVideoThumbnails(playlist);
  }
  else{
    chrome.extension.getBackgroundPage().setCurrPlaylistPage(undefined);
  }
}




function setupVideo(video, prevVideoIndex, videoIndex){
  if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
    var backgroundPlayerStatus = chrome.extension.getBackgroundPage().getInfo({id:"playerState"});
    if(backgroundPlayerStatus == YT.PlayerState.PAUSED){
      updateVideoListPlayButtons(prevVideoIndex, undefined);
    }
    else{
      updateVideoListPlayButtons(prevVideoIndex, videoIndex);
    }
  }
  displayIframe(true);
  updateControlPanel(video);
  play(video);
}

function setupPlaylistSelectionContainer(){
  //var playlistCollection = chrome.extension.getBackgroundPage().getInfo({id:"playlistCollection"});
  var playlistCollection = chrome.extension.getBackgroundPage().getUnfilteredPlaylistCollection();
  var div = document.getElementById("playlist-selection-container");
  var firstDiv = document.createElement("div");
  firstDiv.classList.add("playlist-selection-container-div", "button");
  firstDiv.style.textAlign = "center";
  firstDiv.innerHTML = "Create New Playlist";
  div.appendChild(firstDiv);
  firstDiv.onclick = function(){
    var name = "New Playlist";
    var image = "images/default_playlist_img.png";
    var usingDefaultImage = true;
    chrome.extension.getBackgroundPage().createVideo(currSearchResultId, function(video){
      var videos = [video];
      addPlaylistDiv(name, image, usingDefaultImage, videos);
    });    
    div.style.display = "none";
    
    if(typeof selectedSearchResults != "undefined"){
      selectedSearchResults.resultsContainer.style.backgroundColor = "white";
      selectedSearchResults.resultsOptions.style.backgroundColor = "white";
      selectedSearchResults.addIcon.style.display = "none";
      selectedSearchResults = undefined;
    }
  }
  playlistSelectionContainerList.push(firstDiv);
  var j = 0;
  for(i = 0; i < playlistCollection.length; i++){
    if(playlistCollection[i] != -1){
      var playlistDiv = document.createElement("div");
      playlistDiv.id = i + ":" + j;
      playlistDiv.classList.add("playlist-selection-container-div", "button");
      playlistDiv.innerHTML = playlistCollection[i].name;
      div.appendChild(playlistDiv);
      playlistDiv.onclick = function(e){
        div.style.display = "none";
        chrome.extension.getBackgroundPage().addVideoToPlaylist(parseInt(e.path[0].id), currSearchResultId);
        var index = parseInt(e.path[0].id.substr(e.path[0].id.indexOf(":") + 1));
        var videoDisplay = document.getElementById("playlist-display").childNodes[index].childNodes[1];
        var numVideos = parseInt(videoDisplay.innerHTML.substr(0, videoDisplay.innerHTML.indexOf("V") - 1)) + 1;
        videoDisplay.innerHTML = numVideos + " Videos";
        if(typeof selectedSearchResults != "undefined"){
          selectedSearchResults.resultsContainer.style.backgroundColor = "white";
          selectedSearchResults.resultsOptions.style.backgroundColor = "white";
          selectedSearchResults.addIcon.style.display = "none";
          selectedSearchResults = undefined;
        }
      }
      playlistSelectionContainerList.push(playlistDiv);
      j++;
    }
  }
}

function displayIframe(on){
  if(on){
    if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist && 
       window.getComputedStyle(document.getElementById("player")).display == "none"){
      document.getElementById("playerImage").style.display = "none";
      document.getElementById("player").style.display = "block";
    }
  }
  else{
    if(window.getComputedStyle(document.getElementById("player")).display == "block"){
      document.getElementById("playerImage").style.display = "block";
      document.getElementById("player").style.display = "none";
    }
  }
}

function setupControlPanel(){
  var repeatOn = chrome.extension.getBackgroundPage().getInfo({id:"repeatStatus"});
  if(repeatOn){
    controlRepeatButton.style.color = "green";
  }
  else{
    controlRepeatButton.style.color = "black";
  }
  var shuffleOn = chrome.extension.getBackgroundPage().getInfo({id:"shuffleStatus"});
  if(shuffleOn){
    controlShuffleButton.style.color = "green";
  }
  else{
    controlShuffleButton.style.color = "black";
  }
  
  var volume = chrome.extension.getBackgroundPage().getVolume();
  if(volume.mute){
    document.getElementById("volume-on").style.display = "none";
    document.getElementById("volume-off").style.display = "block";
    document.getElementById("volume-bar-fill").style.width = "0px";
  }
  else{
    document.getElementById("volume-on").style.display = "block";
    document.getElementById("volume-off").style.display = "none";
    document.getElementById("volume-bar-fill").style.width = (volume.volume / 2) + "px";
  }
}

function updateVideoListPlayButtons(updateToPlay, updateToPause){
  if(typeof updateToPlay != "undefined"){
    if(playlistInfo.viewingPlaylist == playlistInfo.playingPlaylist){
      videoBeingPlayed = videoListPlayButtons[updateToPlay];
    }
    videoListPlayButtons[updateToPlay].childNodes[0].style.display = "block";
    videoListPlayButtons[updateToPlay].childNodes[1].style.display = "none";
  }
  if(typeof updateToPause != "undefined"){
    videoListPlayButtons[updateToPause].childNodes[0].style.display = "none";
    videoListPlayButtons[updateToPause].childNodes[1].style.display = "block";
  }  
}

function updateControlPanelPlayButton(playing){
  if(playing){
    controlPlayButton.style.display = "none";
    controlPauseButton.style.display = "block";
  }
  else{
    controlPlayButton.style.display = "block";
    controlPauseButton.style.display = "none";
  }
}

function updatePlayPlaylistButton(playing){
 /* if(playing && playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
    playPlaylistButton.innerHTML = "Pause";
  }
  else{
    playPlaylistButton.innerHTML = "Play";
  }*/
}

function updateControlPanel(video){
  
  if(!controlLoaded){
    setupControlPanel();
  }

}

function updatePlayistPageImage(){
  document.getElementById("player-image-image").src = 
    chrome.extension.getBackgroundPage().getPlaylistImage(playlistInfo.viewingPlaylist, SD_DEFAULT_IMG);
}

function updatePlaylistDivImage(playlistIndex){
  //document.getElementById("playlistList").childNodes[playlistInfo.viewingPlaylist].childNodes[0].childNodes[0].src = 
  //      chrome.extension.getBackgroundPage().getPlaylistImage(playlistInfo.viewingPlaylist, MQ_DEFAULT_IMG);
}

function play(video){
  if(video.videoId != currVideoId){
    pagePlayerStatus = "waitingForSync";
    pagePlayer.loadVideoById(video.videoId, 0, quality);
    chrome.extension.getBackgroundPage().loadVideo(video.videoId);
    currVideoId = video.videoId;
  }
  else{
    pagePlayer.seekTo(0);
    chrome.extension.getBackgroundPage().seekTo(0);
    pagePlayer.playVideo();
  }
}

function onload(){
  loadDivs();
  initListeners();
  setupControlPanel();
  if(pagePlayerReady){
    loadPlayerState();
  }
  else{
    setTimeout(checkPlayerLoaded, 100);
  }
  displayPlaylists();
  setupPlaylistSelectionContainer();
}

function checkPlayerLoaded(){
  if(pagePlayerReady){
    loadPlayerState();
  }
  else{
    setTimeout(checkPlayerLoaded, 100);
  }
}

function err(data){
  chrome.extension.getBackgroundPage().console.error(data);
}

function log(data){
  chrome.extension.getBackgroundPage().console.log(data);
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
  // When the background page finishes loading the video, then play the video
  if(message.request == "finishedLoading"){
    if(pagePlayerStatus != "stopAfterBuffering"){
      pagePlayerStatus = "ready";
      pagePlayer.playVideo();
    }
  }
  else if(message.request == "finishedSeeking"){
    pagePlayer.seekTo(message.time);
  }
  else if(message.request == "finishedAddingVideo"){
    if(window.getComputedStyle(document.getElementById("search-container")).display == "none" ||
       message.playlistIndex == playlistInfo.viewingPlaylist){
      createVideoDiv(message.video, message.index);
    }
    
    if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
      chrome.extension.getBackgroundPage().addToQueue(message.video, videoListPlayButtons.length - 1);
    }
    if(playlistInfo.viewingPlaylist != -1 && chrome.extension.getBackgroundPage().getPlaylistLength(playlistInfo.viewingPlaylist) == 1){
      document.getElementById("player-image-image").src = 
        chrome.extension.getBackgroundPage().getPlaylistImage(playlistInfo.viewingPlaylist, SD_DEFAULT_IMG);
      document.getElementById("playlistList").childNodes[playlistInfo.viewingPlaylist].childNodes[0].childNodes[0].src = 
        chrome.extension.getBackgroundPage().getPlaylistImage(playlistInfo.viewingPlaylist, MQ_DEFAULT_IMG);
      document.getElementById("playlistList").childNodes[playlistInfo.viewingPlaylist].childNodes[0].childNodes[0].style.top = "-5%";
    }
  }
  else if(message.request == "pause"){
    pagePlayerStatus = "pausedByBackgroundPlayer";
    pagePlayer.pauseVideo();
  }
  else if(message.request == "play"){
    pagePlayerStatus = "ready";
    pagePlayer.playVideo();
  }
  else if(message.request == "playNextVideo"){
    setupVideo(message.video, message.prevVideoIndex, message.videoIndex);
  }
  else if(message.request == "playPrevVideo"){
    setupVideo(message.video, message.prevVideoIndex, message.videoIndex);
  }
  else if(message.request == "setControlImage"){
    var img = document.createElement("img");
    img.src = "https://img.youtube.com/vi/"+message.id+"/default.jpg";
    img.style.height = "inherit";
    document.getElementById("controlsImage").appendChild(img);
  }
  else if(message.request = "playlistEnded"){
    if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
      updateVideoListPlayButtons(message.videoIndex, undefined);
    }
    updateControlPanelPlayButton(false);
    updatePlayPlaylistButton(false);
  }
});

function setPlayingPlaylist(){
  playlistInfo.playingPlaylist = playlistInfo.viewingPlaylist;
  chrome.extension.getBackgroundPage().setPlayingPlaylist(playlistInfo.playingPlaylist);
}

window.addEventListener("load", onload, false);