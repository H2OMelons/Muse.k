var port = chrome.runtime.connect();

var playlistDivImgHeight = "135px";
var playlistDivHeight = "155px";//"100px";
var playlistDivWidth = "240px";//"225px";
var leftMargin = 30;
var topMargin = 100;
var x_spacing = 245;
var y_spacing = 125;

var currPlaylistId;

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

var deletePlaylistButton;

var overlay;

var moreOptionsButton;
var moreOptionsPopup;

var playlistPage;
var deletePlaylistPopup;
var playPlaylistButton;
var deletePlaylistPopupConfirmButton;
var deletePlaylistPopupCancelButton;
var editPlaylistButton;

var videoList;
var addVideoButton;
var addVideoModal;
var videoUrlInput;
var addVideoConfirmButton;
var addVideoCancelButton;

var backgroundPlayer;
var modalPlayerStatus;
var pagePlayerStatus;
var backgroundPlayerStatus;

var currPlaylistNum;
var currVideoId;

var videoBeingPlayed;
var popupStatus = -1;

var firstVideo = undefined;
var containerToRemove = undefined;
var videoIndexToRemove = undefined;
var settingsIndex = undefined;

var nameInputFieldIsHighlighted = false;
var setImageButton;
var currPlaylistLoaded;

var controlLoaded = false;

var volumeAdjuster;
var volumeBar;
var quality;

var qualityCheck = false;

var tag = document.createElement('script');

tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

var modalPlayer = undefined;
var pagePlayer = undefined;
function onYouTubeIframeAPIReady() {
  popupStatus = 0;
  modalPlayer = new YT.Player('videoModalResultDisplay', {
    playerVars:{
      "origin": "example.com"
    },
    events: {
      'onReady': onModalPlayerReady,
      'onStateChange': onModalPlayerStateChange,
      'onPlaybackQualityChange': onPlaybackQualityChange
    }
  });
  
  var state = chrome.extension.getBackgroundPage().getInfo({id:"playerState"});
  var id = chrome.extension.getBackgroundPage().getInfo({id:"currVideoId"});
  if(state >= 0 && state < 5 && typeof id != "undefined"){
    qualityCheck = true;
    pagePlayer = new YT.Player('playlistPageIframe', {
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
    pagePlayer = new YT.Player('playlistPageIframe', {
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
    if(pagePlayer.getPlayerState() > 0 && pagePlayer.getPlayerState() < 5){
      pagePlayer.pauseVideo();
    }
  }
  else if(event.data == YT.PlayerState.BUFFERING){
    if(pagePlayer.getPlayerState() > 0 && pagePlayer.getPlayerState() < 5){
      pagePlayer.pauseVideo();
    }
  }
  else if(event.data == YT.PlayerState.PAUSED){
    
  }
  else if(event.data == YT.PlayerState.ENDED){
    if(pagePlayer.getPlayerState() > 0 && pagePlayer.getPlayerState() < 5){
      pagePlayer.playVideo();
    }
  }
}

function onPlaybackQualityChange(data){

}

function onPagePlayerStateChange(event){
  if(event.data == YT.PlayerState.PLAYING){

    //document.getElementById("controlsPlayButton").innerHTML = "Pause";
    // If page player is waiting for sync, then we do not want to play the video yet
    // Set popup status, pause video, and seek to the beginning and wait for the 
    // background page to finish loading the video
    if(pagePlayerStatus == "waitingForSync"){
      popupStatus = 1;
      pagePlayer.pauseVideo();
      pagePlayer.seekTo(0);
      chrome.extension.getBackgroundPage().createVideo(currVideoId);
    }
    else if(pagePlayerStatus == "seeking"){
      pagePlayer.pauseVideo();
      pagePlayerStatus = "ready";
    }
    else{
      chrome.extension.getBackgroundPage().playVideo();
      updatePlayPauseButtonStates(true);
    }
  }
  else if(event.data == YT.PlayerState.PAUSED){

    if(pagePlayerStatus != "waitingForSync"){
      chrome.extension.getBackgroundPage().pauseVideo();
    }
    //document.getElementById("controlsPlayButton").innerHTML = "Play";
    updatePlayPauseButtonStates(false);
  }
  else if(event.data == YT.PlayerState.BUFFERING){

    if(pagePlayerStatus != "waitingForSync"){
      chrome.extension.getBackgroundPage().pauseVideo();
    }
    else{
      
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
  modalPlayerStatus = "waitingForUserAction";
  modalPlayer.loadVideoById(videoId, 0, quality);
  document.getElementById("videoModalResultDisplay").style.display = "block";
}

function onModalPlayerReady(event){

}

function onPagePlayerReady(){
  var volume = chrome.extension.getBackgroundPage().getVolume();
  pagePlayer.setVolume(volume);
  if(qualityCheck){
    quality = chrome.extension.getBackgroundPage().getInfo({id:"quality"});
    pagePlayer.setPlaybackQuality(quality);
    qualityCheck = false;
  }
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

function initListeners(){
  // Brings up the options page when the user clicks on the profile icon
  // and closes the options page when the user clicks on the icon again
  profileIconDiv.onclick = function(target){
    if(target.path[0].id == "profileIconDivImage"){
      if(window.getComputedStyle(optionsPageDiv).display == "none"){
        optionsPageDiv.style.display = "block"; 
      }
      else{
        optionsPageDiv.style.display = "none";
        document.getElementById("qualitySelectionContainer").style.display = "none";
        document.getElementById("optionsPageButtonContainer").style.display = "block";
      }
    }
  }
  // Opens a window for the user to add a playlist and closes the window 
  // if clicked again
  addPlaylistButton.onclick = function(){
    displayPlaylistPopup(false);
  }
  // Clicks the create playlist button when user hits enter key
  searchInput.onkeyup = function(){
    if(event.keyCode == 13){
      searchButton.click();
    }
  }
  // Searches for playlists with the given keyword
  searchButton.onclick = function(){
    var search = searchInput.value;
    if(!search.replace(/\s/g, '').length){
       //chrome.extension.getBackgroundPage().console.log("search input only contained whitespaces");
    }
    else{
      //chrome.extension.getBackgroundPage().console.log(searchInput.value + " " + search.length);
    }
  }
  homeButton.onclick = function(){
    if(window.getComputedStyle(playlistContainer).display == "none"){
      playlistContainer.style.display = "block"; 
    }
    if(window.getComputedStyle(playlistPage).display != "none"){
      playlistPage.style.display = "none";     
      firstVideo = undefined;
      if(document.getElementById("playlistPageImage").style.display == "none"){
        document.getElementById("playlistPageImage").style.display = "block";
        document.getElementById("playlistPageIframe").style.display = "none";
      }
      else{
        document.getElementById("playlistPageImage").style.display = "block";
        currPlaylistPage = -1;
        if(document.getElementById("playlistPageImageImage")){
          document.getElementById("playlistPageImageImage").parentNode.removeChild(document.getElementById("playlistPageImageImage"));
        }
        
        document.getElementById("playlistPageIframe").style.display = "none";
      }
      
    }
    var list = document.getElementById("videoList").childNodes;
    for(i = 0; i < list.length; i++){
      list[i].parentNode.removeChild(list[i]);
    }
    homeButton.style.display = "none";
  }
  deletePlaylistButton.onclick = function(){
    if(window.getComputedStyle(deletePlaylistPopup).display == "none"){
      overlay.style.display = "block";
      deletePlaylistPopup.style.display = "block"; 
    }
    else{
      overlay.style.display = "none";
      deletePlaylistPopup.style.display = "none";
    }
  }
  deletePlaylistPopupCancelButton.onclick = function(){
    overlay.style.display = "none";
    deletePlaylistPopup.style.display = "none";
  }
  deletePlaylistPopupConfirmButton.onclick = function(event){
    var currVideoInfo = chrome.extension.getBackgroundPage().getInfo({id:"currVideoInfo"});
    var retVal = chrome.extension.getBackgroundPage().deletePlaylist(currPlaylistNum);
    if(typeof currPlaylistId != "undefined" && 
       (retVal == 1 || retVal == 0)){
      document.getElementById(currPlaylistId).parentNode.removeChild(document.getElementById(currPlaylistId));
      if(typeof currVideoInfo != "undefined" && currVideoInfo.playlistIndex == currPlaylistNum){
        videoBeingPlayed = undefined;
        currVideoId = undefined;
      }
      currPlaylistId = undefined;
      currPlaylistNum = undefined;
      
      
      if(document.getElementById("playlistPageImageImage") != null){
        document.getElementById("playlistPageImageImage").parentNode.removeChild(document.getElementById("playlistPageImageImage"));
      }
      if(retVal == 0){
        document.getElementById("controls").classList.remove("controlAnimation");
        controls.top = "515px";
        controlLoaded = false;
      }
      deletePlaylistPopup.style.display = "none";
      playlistPage.style.display = "none";
      playlistContainer.style.display = "block";
      overlay.style.display = "none";
      homeButton.style.display = "none";
      var list = document.getElementById("videoList").childNodes;
      for(i = 0; i < list.length; i++){
        list[i].parentNode.removeChild(list[i]);
      }
    }
    else{
      //log("something went wrong with deleting the playlist");
    }
  }
  
  moreOptionsButton.onclick = function(){
    if(window.getComputedStyle(moreOptionsPopup).display == "none"){
      moreOptionsPopup.style.display = "block";
    }
    else{
      moreOptionsPopup.style.display = "none";
    }
  }
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
  }
  
  videoUrlInput.onkeyup = function(){
    var enteredUrl = videoUrlInput.value;
    var key = "watch?v=";
    var start = enteredUrl.indexOf(key);
    if(start != -1){
      start += key.length;
      var end = start + 11;
      var videoId = enteredUrl.slice(start, end);
      if(videoId.length == 11){
        //currVideoId = videoId;
        loadVideoPreview(videoId);
      }
    }
  }
  addVideoConfirmButton.onclick = function(){
    var enteredUrl = videoUrlInput.value;
    var key = "watch?v=";
    var start = enteredUrl.indexOf(key);
    if(start != -1){
      start += key.length;
      var end = start + 11;
      var videoId = enteredUrl.slice(start, end);
      chrome.extension.getBackgroundPage().addVideoToPlaylist(currPlaylistNum, videoId);
    }
    addVideoCancelButton.click();
  }
  addVideoCancelButton.onclick = function(){
    addVideoModal.style.display = "none";
    videoUrlInput.value = "";
    modalPlayer.stopVideo();
    modalPlayerStatus = "waitingForUserAction";
    document.getElementById("videoModalResultDisplay").style.display = "none";
    overlay.style.display = "none";
  }
  
  document.getElementById("controlsPlayButton").onclick = function(){
    if(document.getElementById("controlsPlayButton").innerHTML == "Play"){
      if(pagePlayerStatus != "waitingForSync" && 
        (pagePlayer.getPlayerState() == YT.PlayerState.PAUSED ||
         chrome.extension.getBackgroundPage().getInfo({id:"playerState"}) == YT.PlayerState.PAUSED)){
        if(pagePlayer.getPlayerState() != YT.PlayerState.PAUSED){
          chrome.extension.getBackgroundPage().playVideo();
          updatePlayPauseButtonStates(true);
        }
        else{
          pagePlayer.playVideo();
        }
        //document.getElementById("controlsPlayButton").innerHTML = "Pause";
      }
    }
    else{
      if(pagePlayerStatus != "waitingForSync" &&
         (pagePlayer.getPlayerState() == YT.PlayerState.PLAYING ||
          chrome.extension.getBackgroundPage().getInfo({id:"playerState"}) == YT.PlayerState.PLAYING)){
        if(pagePlayer.getPlayerState() != YT.PlayerState.PLAYING){
          chrome.extension.getBackgroundPage().pauseVideo();
          updatePlayPauseButtonStates(false);
        }
        else{
          pagePlayer.pauseVideo();
        }
        //document.getElementById("controlsPlayButton").innerHTML = "Play";
      }
    }
  }
  document.getElementById("controlsFastForwardButton").onclick = function(){
    chrome.extension.getBackgroundPage().fastForward();
  }
  document.getElementById("controlsRewindButton").onclick = function(){
    chrome.extension.getBackgroundPage().rewind();
  }
  
  playPlaylistButton.onclick = function(){
    if(playPlaylistButton.innerHTML == "Play"){
      var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlist", playlistNumber:currPlaylistNum});
      if(playlist.videos.length > 0){
        if(!controlLoaded){
          document.getElementById("controls").classList.add("controlAnimation");
          controlLoaded = true;
        }

        if(typeof videoBeingPlayed != "undefined"){
          var info = chrome.extension.getBackgroundPage().getInfo({id:"currVideoInfo"});
          if(info.playlistIndex == currPlaylistNum){
            pagePlayer.playVideo();  
          }
          else{
            var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlist", playlistNumber:currPlaylistNum});
            if(typeof firstVideo != "undefined"){
              //firstVideo.click();
              startPlaylist(-1, currPlaylistNum);
            }
          }

        }
        else{
          if(typeof firstVideo != "undefined"){
            //firstVideo.click();
            startPlaylist(-1, currPlaylistNum);
          }
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
  playlistInputField.onkeyup = function(){
    var numChars = playlistInputField.value.length;
    document.getElementById("playlistTextboxCharCount").innerHTML = numChars + "/50";
  }
  document.getElementById("playlistDescriptionInput").onkeyup = function(){
    var numChars = document.getElementById("playlistDescriptionInput").value.length;
    document.getElementById("playlistDescriptionTextboxCharCount").innerHTML = numChars + "/125";
  }
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
      document.getElementById("playlistSetImageImage").src = "images/default_playlist_img.png"
    }
  }, true);
  editPlaylistButton.onclick = function(){
    displayPlaylistPopup(true);
  }
  document.getElementById("controlsRepeatToggle").onclick = function(){
    var repeatOn = chrome.extension.getBackgroundPage().getInfo({id:"repeatStatus"});
    if(repeatOn){
      document.getElementById("controlsRepeatToggle").innerHTML = "Repeat Off";
    }
    else{
      document.getElementById("controlsRepeatToggle").innerHTML = "Repeat On";
    }
    chrome.extension.getBackgroundPage().setRepeat(!repeatOn);
  }
  document.getElementById("controlsShuffleToggle").onclick = function(){
    var shuffleOn = chrome.extension.getBackgroundPage().getInfo({id:"shuffleStatus"});
    if(shuffleOn){
      document.getElementById("controlsShuffleToggle").innerHTML = "Shuffle Off";
    }
    else{
      document.getElementById("controlsShuffleToggle").innerHTML = "Shuffle On";
    }
    chrome.extension.getBackgroundPage().setShuffle(!shuffleOn);
  }
  volumeAdjuster.onclick = function(){
    
  }
  volumeBar.onclick = function(e){
    var volume = e.offsetX;

    // Round volume up to the nearest number divisible by 5 unless volume is less than 5
    if(volume < 5){
      volume = 0;
    }
    /*
    if(volume % 5 != 0){
      volume += (5 - (volume % 5));
    }*/
    document.getElementById("controlsVolumeBarVolumeDisplay").style.width = volume + "px";
    // Convert volume to be in range 0-100
    volume = Math.round((volume / 75) * 100);
    pagePlayer.setVolume(volume);
    chrome.extension.getBackgroundPage().setVolume(volume);
  }
  document.getElementById("changeQualityButton").onclick = function(){
    document.getElementById("optionsPageButtonContainer").style.display = "none";
    document.getElementById("qualitySelectionContainer").style.display = "block";
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
  document.getElementById("changeQualityBackButton").onclick = function(){
    document.getElementById("qualitySelectionContainer").style.display = "none";
    document.getElementById("optionsPageButtonContainer").style.display = "block";
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
}

function loadDivs(){
  profileIconDiv = document.getElementById("profileIconDiv");
  optionsPageDiv = document.getElementById("optionsPageDiv");
  usernameDiv = document.getElementById("usernameDiv");
  addPlaylistButton = document.getElementById("addPlaylistButton");
  playlistPopup = document.getElementById("playlistPopup");
  createPlaylistButton = document.getElementById("createPlaylistButton");
  cancelCreateButton = document.getElementById("cancelPlaylistCreateButton");
  playlistInputField = document.getElementById("playlistInput");
  playlistContainer = document.getElementById("playlistContainer");
  searchInput = document.getElementById("searchInput");
  searchButton = document.getElementById("searchButton");
  homeButton = document.getElementById("homeButton");
  playlistPage = document.getElementById("playlistPage");
  deletePlaylistButton = document.getElementById("playlistPageDeletePlaylistButton");
  deletePlaylistPopup = document.getElementById("deletePlaylistPopup");
  deletePlaylistPopupCancelButton = document.getElementById("deletePlaylistPopupCancelButton");
  deletePlaylistPopupConfirmButton = document.getElementById("deletePlaylistPopupConfirmButton");
  overlay = document.getElementById("overlay");
  videoList = document.getElementById("videoList");
  moreOptionsButton = document.getElementById("moreOptionsButton");
  moreOptionsPopup = document.getElementById("moreOptionsPopup");
  addVideoButton = document.getElementById("playlistPageAddVideoButton");
  addVideoModal = document.getElementById("addVideoModal");
  videoUrlInput = document.getElementById("urlInput");
  addVideoCancelButton = document.getElementById("addVideoCancelButton");
  addVideoConfirmButton = document.getElementById("addVideoConfirmButton");
  playPlaylistButton = document.getElementById("playPlaylistButton");
  setImageButton = document.getElementById("playlistSetImageButton");
  editPlaylistButton = document.getElementById("playlistPageEditPlaylistButton");
  volumeAdjuster = document.getElementById("controlsVolumeAdjuster");
  volumeBar = document.getElementById("controlsVolumeBar");
}

function displayPlaylistPopup(edit){
  playlistPopup.style.display = "block"; 
  overlay.style.display = "block";
  playlistInputField.focus();
  if(edit){
    if(currPlaylistLoaded.videos.length > 0 && currPlaylistLoaded.image.slice(-31) == "images/default_playlist_img.png"){
      //document.getElementById("playlistSetImageImage").parentNode.removeChild(document.getElementById("playlistSetImageImage"));
      //var img = document.createElement("img");
      document.getElementById("playlistSetImageImage").src = 
        "https://img.youtube.com/vi/"+currPlaylistLoaded.videos[0].videoId+"/mqdefault.jpg";
    }
    else{
      document.getElementById("playlistSetImageImage").src = currPlaylistLoaded.image;
    }
    playlistInputField.value = currPlaylistLoaded.name;
    document.getElementById("playlistDescriptionInput").value = currPlaylistLoaded.description;
    createPlaylistButton.addEventListener("click", editPlaylistCreate);
    cancelCreateButton.addEventListener("click", addPlaylistCancel);
  }
  else{
    document.getElementById("playlistSetImageImage").src = "images/default_playlist_img.png";
    createPlaylistButton.addEventListener("click", addPlaylistCreate);
    cancelCreateButton.addEventListener("click", addPlaylistCancel);
  }
}

function editPlaylistCreate(){
  var name = playlistInputField.value;
  var description = document.getElementById("playlistDescriptionInput").value;
  var image = document.getElementById("playlistSetImageImage").src;
  var playlistUpdated = false;
  if(name != currPlaylistLoaded.name){
    playlistUpdated = true;
    currPlaylistLoaded.name = name;
    document.getElementById("descriptionBoxTitle").innerHTML = name;
    document.getElementById(currPlaylistId).childNodes[1].innerHTML = name;
  }
  if(description != currPlaylistLoaded.description){
    playlistUpdated = true;
    currPlaylistLoaded.description = description;
    document.getElementById("descriptionBoxContent").innerHTML = description;
  }
  if(image != currPlaylistLoaded.image && currPlaylistLoaded.videos.length > 0 &&
     image != "https://img.youtube.com/vi/"+currPlaylistLoaded.videos[0].videoId+"/mqdefault.jpg"){
    playlistUpdated = true;
    currPlaylistLoaded.image = image;
    if(document.getElementById("playlistPageImageImage")){
      document.getElementById("playlistPageImageImage").src = image;
    }
    
    document.getElementById(currPlaylistId).childNodes[0].childNodes[0].src = image;
  }
  else if(image != currPlaylistLoaded.image){
    playlistUpdated = true;
    currPlaylistLoaded.image = image;
    if(document.getElementById("playlistPageImageImage")){
      document.getElementById("playlistPageImageImage").src = image;
    }
    
    document.getElementById(currPlaylistId).childNodes[0].childNodes[0].src = image;
  }
  if(playlistUpdated){
    chrome.extension.getBackgroundPage().updateCurrPlaylist(currPlaylistLoaded);
  }
  playlistPopup.style.display = "none";
  playlistInputField.value = "New Playlist";
  overlay.style.display = "none";
  document.getElementById("playlistDescriptionInput").value = "";
  createPlaylistButton.removeEventListener("click", editPlaylistCreate);
  cancelCreateButton.removeEventListener("click", addPlaylistCancel);
}

function addPlaylistCreate(){
  var userInput = playlistInputField.value;
  var description = document.getElementById("playlistDescriptionInput").value;
  var image = document.getElementById("playlistSetImageImage").src;
  addPlaylistDiv(userInput, description, image);
  playlistPopup.style.display = "none";
  playlistInputField.value = "New Playlist";
  overlay.style.display = "none";
  document.getElementById("playlistDescriptionInput").value = "";
  createPlaylistButton.removeEventListener("click", addPlaylistCreate);
  cancelCreateButton.removeEventListener("click", addPlaylistCancel);
}

function addPlaylistCancel(){
  playlistPopup.style.display = "none";
  playlistInputField.value = "New Playlist";
  overlay.style.display = "none";
  document.getElementById("playlistDescriptionInput").value = "";
  createPlaylistButton.removeEventListener("click", addPlaylistCreate);
  cancelCreateButton.removeEventListener("click", addPlaylistCancel);
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
  // Get info about the current video being played from the background page
  var currVideoInfo = chrome.extension.getBackgroundPage().getInfo({id:"currVideoInfo"});
  if(typeof currVideoInfo == "undefined" || playlistNumber != currVideoInfo.playlistIndex){
    document.getElementById("playPlaylistButton").innerHTML = "Play";
  }
  else{
    var state =  chrome.extension.getBackgroundPage().getInfo({id:"playerState"});
    if(state == YT.PlayerState.PLAYING){
      document.getElementById("playPlaylistButton").innerHTML = "Pause";
    }
    else if(state == YT.PlayerState.PAUSED){
      document.getElementById("playPlaylistButton").innerHTML = "Play";
    }
  }
  currPlaylistNum = playlistNumber;
  
  var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlist", playlistNumber: playlistNumber});
  currPlaylistLoaded = playlist;
  
  var botContainer = document.getElementById("botContainer");
  if(typeof playlist != "undefined"){
    chrome.extension.getBackgroundPage().setCurrPlaylistPage(playlistNumber);
    var videos = playlist.videos;
    var state = chrome.extension.getBackgroundPage().getInfo({id:"displayIframe"});
    if(state){
      document.getElementById("playlistPageIframe").style.display = "block";
      document.getElementById("playlistPageImage").style.display = "hidden";
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
    }
    else{
      var img = document.createElement("img");
      img.id = "playlistPageImageImage";
      img.style.marginTop = "-40px";
      //img.style.height = "320px";
      img.style.width = "100%";
      if(videos.length > 0){
        if(playlist.image.slice(-31) == "images/default_playlist_img.png"){
          img.src = "https://img.youtube.com/vi/"+videos[0].videoId+"/sddefault.jpg";
        }
        else{
          img.src = playlist.image;
        }
        
      }
      else{
        img.src = playlist.image;
      }
      document.getElementById("playlistPageImage").appendChild(img);
      document.getElementById("playlistPageIframe").style.display = "none";
      document.getElementById("playlistPageImage").style.display = "block";
    }
    playlistContainer.style.display = "none";
    playlistPage.style.display = "block";
    document.getElementById("descriptionBoxTitle").innerHTML = playlist.name;
    if(typeof playlist.description != "undefined"){
      document.getElementById("descriptionBoxContent").innerHTML = playlist.description;
    }
    else{
      document.getElementById("descriptionBoxContent").innerHTML = "";
    }
    displayPlaylistVideoThumbnails(playlist);
  }
  else{
    chrome.extension.getBackgroundPage().setCurrPlaylistPage(undefined);
    //chrome.extension.getBackgroundPage().console.log("something went wrong when getting playlist to load");
  }
}


var videoIndexes = []; // Array to keep track of the indexes of the videos for when users want to delete videos from playlists
function displayPlaylistVideoThumbnails(playlist){
  var videos = playlist.videos;
  
  if(videos.length > 0){
    for(i = 0; i < videos.length; i++){
      videoIndexes.push(i);
      createVideoDiv(videos[i], i);
    }   
  }
  else{

  }  
}

/**
 * Plays the video in the current playlist with the given index
 * 1. Get the current playlist from the background page
 * 2. Get the id of the video to be played
 * 3. If the video is not already playing
 *    a. Set the page player status to wait for sync with background player
 *    b. Use the page player to load the given video
 *    c. 
 * 4. If the video is already playing
 */
function playVideo(videoIndex, playlistIndex){
  
  if(typeof playlistIndex == "undefined"){
    playlistIndex = currPlaylistNum;
  }
  
  // 1. Get the current playlist from the background page
  var collection = chrome.extension.getBackgroundPage().getInfo({id:"playlist", playlistNumber: playlistIndex});
  var currVideoInfo = chrome.extension.getBackgroundPage().getInfo({id:"currVideoInfo"});
  var order = chrome.extension.getBackgroundPage().getInfo({id:"order"});
  
  // 2. Get the id of the video to be played
  var videoId = collection.videos[order[videoIndex]].videoId;
  // 3. If the video is not already playing / was not previously selected
  if(videoId != currVideoId){
    // a. Set the page player status to wait for sync with background player
    pagePlayerStatus = "waitingForSync";
    // b. Use the page player to load the given video-when video finished loading, goes to onPagePlayerStateChange
    pagePlayer.loadVideoById(videoId, 0, quality);
    // c. Save the id of the video currently being loaded
    currVideoId = videoId;
    // d. Display the iframe for the video
    if(playlistIndex == currPlaylistNum){
      if(window.getComputedStyle(document.getElementById("playlistPageImage")).display == "none"){
        document.getElementById("playlistPageImage").style.display = "none";
        document.getElementById("playlistPageIframe").style.display = "block";
      }
      else{
        if(document.getElementById("playlistPageImageImage")){
          document.getElementById("playlistPageImageImage").parentNode.removeChild(document.getElementById("playlistPageImageImage"));
        }
        
        document.getElementById("playlistPageImage").style.display = "none";
        document.getElementById("playlistPageIframe").style.display = "block";
      }
    }
    
    
    // e. Save info of current video and playlist being played in background page
    chrome.extension.getBackgroundPage().setCurrVideoBeingPlayed(videoIndex, playlistIndex, function(){
      setUpControlPanel();
    });
    
  }
  // 4. If the video is already playing but the same video was selected in a different playlisit
  else if(videoId == currVideoId && typeof currVideoInfo != "undefined" && currPlaylistNum != currVideoInfo.playlistIndex){
    pagePlayer.seekTo(0);  
    chrome.extension.getBackgroundPage().seekTo(0);
    pagePlayer.playVideo();
    if(playlistIndex == currPlaylistNum){
      if(window.getComputedStyle(document.getElementById("playlistPageImage")).display == "none"){
        document.getElementById("playlistPageImage").style.display = "none";
        document.getElementById("playlistPageIframe").style.display = "block";
      }
      else{
        if(document.getElementById("playlistPageImageImage")){
          document.getElementById("playlistPageImageImage").parentNode.removeChild(document.getElementById("playlistPageImageImage"));
        }
        
        document.getElementById("playlistPageImage").style.display = "none";
        document.getElementById("playlistPageIframe").style.display = "block";
      }
    }
  }
  // 5. If the video is already playing / was previously selected
  else{
    
    // a. If the video was paused, then play it
    if(pagePlayer.getPlayerState() == YT.PlayerState.PAUSED){
      //pagePlayerStatus = "waitingForSync";
      pagePlayer.playVideo();
      //chrome.extension.getBackgroundPage().playVideo();
    }
    // b. If the video was playing, then pause it
    else if(pagePlayer.getPlayerState() == YT.PlayerState.PLAYING){
      pagePlayerStatus = "waitingForSync";
      pagePlayer.seekTo(0);
      //chrome.extension.getBackgroundPage().pauseVideo();
    }
    // c. If the video was buffering, pause it
    else if(pagePlayer.getPlayerState() == YT.PlayerState.BUFFERING){
      pagePlayerStatus = "waitingForSync";
      pagePlayer.seekTo(0);
      //chrome.extension.getBackgroundPage().pauseVideo();
    }
    // d. If the video ended, play it again
    else if(pagePlayer.getPlayerState() == YT.PlayerState.ENDED){
      pagePlayerStatus = "waitingForSync";
      pagePlayer.playVideo();
      //chrome.extension.getBackgroundPage().playVideo();
    }
    // e. Otherwise, play the video
    else{
      pagePlayer.playVideo();
      //chrome.extension.getBackgroundPage().playVideo();
    }
  }
  chrome.extension.getBackgroundPage().setCurrVideoBeingPlayed(videoIndex, playlistIndex);
}

function startPlaylist(startingVideo, playlistIndex){
  var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlist", playlistNumber:playlistIndex});
  var shuffleOn = chrome.extension.getBackgroundPage().getInfo({id:"shuffleStatus"});
  if(startingVideo == -1 && shuffleOn){
    startingVideo = Math.floor(Math.random() * playlist.videos.length); 
  }
  else if(startingVideo == -1 && !shuffleOn){
    startingVideo = 0;
  }
  chrome.extension.getBackgroundPage().shufflePlaylist(startingVideo, playlistIndex);
  
  if(typeof videoBeingPlayed == "undefined"){
    var order = chrome.extension.getBackgroundPage().getInfo({id:"order"});
    var list = document.getElementById("videoList");
    var listChildren = list.childNodes;
    videoBeingPlayed = listChildren[startingVideo].childNodes[0];  
  }
  
  if(shuffleOn){
    playVideo(0, playlistIndex);
  }
  else{
    playVideo(startingVideo, playlistIndex);
  }
}

function updatePlayPauseButtonStates(videoIsPlaying){
  var retVal = chrome.extension.getBackgroundPage().getInfo({id:"currVideoInfo"});
  var playButtons = document.getElementsByClassName("playButton");
  if(videoIsPlaying){
    if(retVal.playlistIndex == currPlaylistNum){
      document.getElementById("playPlaylistButton").innerHTML = "Pause";
    }
    document.getElementById("controlsPlayButton").innerHTML = "Pause";  
    if(typeof videoBeingPlayed != "undefined"){
      videoBeingPlayed.innerHTML = "Pause";
    }
  }
  else{
    if(retVal.playlistIndex == currPlaylistNum){
      document.getElementById("playPlaylistButton").innerHTML = "Play";
    }
    
    document.getElementById("controlsPlayButton").innerHTML = "Play";
    if(typeof videoBeingPlayed != "undefined"){
      videoBeingPlayed.innerHTML = "Play";
    }
  }
}

function createVideoDiv(video, index){
  var retVal = chrome.extension.getBackgroundPage().getInfo({id:"currVideoInfo"});
  var container = document.createElement("div");
  container.classList.add("videoList", "container", "botBorder", "video");
  
  var imageContainer = document.createElement("div");
  imageContainer.classList.add("videoList", "imageContainer");
  if(index == 0){
    firstVideo = imageContainer;
  }
  if(typeof retVal != "undefined" && retVal.videoIndex == index && retVal.playlistIndex == currPlaylistNum){
    if(chrome.extension.getBackgroundPage().getInfo({id:"playerState"}) == YT.PlayerState.PLAYING){
      imageContainer.innerHTML = "Pause";
    }
    else{
      imageContainer.innerHTML = "Play";
    }
    videoBeingPlayed = imageContainer;
  }
  else{
    imageContainer.innerHTML = "Play";
  }
  
  imageContainer.onclick = function(){
    if(imageContainer.innerHTML == "Play"){
      if(typeof videoBeingPlayed != "undefined"){
        // If another video is currently playing then change the button status
        videoBeingPlayed.innerHTML = "Play";
      }
      videoBeingPlayed = imageContainer;
      startPlaylist(index, currPlaylistNum);

      if(!controlLoaded){
        document.getElementById("controls").classList.add("controlAnimation");
        controlLoaded = true;
      }
      
    }
    else{
      pagePlayer.pauseVideo();
    }
    
  };
  var title = document.createElement("div");
  title.classList.add("videoList", "titleContainer");
  title.innerHTML = video.videoTitle;
  var channel = document.createElement("div");
  channel.classList.add("videoList", "channelContainer");
  channel.innerHTML = video.channelTitle;
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
  settings.classList.add("videoList", "settingsContainer");
  settings.innerHTML = "s";
  settings.onclick = function(){
    var settingsDiv = document.getElementById("videoSettingsModal");
    if(window.getComputedStyle(settingsDiv).display == "none"){
      settingsIndex = index;
      settingsDiv.style.top = (-40 + (25*index))+"px";
      settingsDiv.style.display = "block";
      containerToRemove = container;
      videoIndexToRemove = index;
      document.getElementById("deleteVideoButton").addEventListener("click", removeVideo);
      document.getElementById("editVideoButton").addEventListener("click", editVideo);
    }
    else{
      if(settingsIndex == index){
        settingsDiv.style.display = "none";
        containerToRemove = undefined;
        videoIndexToRemove = undefined;
      }
      else{
        settingsDiv.style.top = (-40 + (25*index))+"px";
        settingsIndex = index;
        videoIndexToRemove = index;
        containerToRemove = container;
      }
    }
  }
  settings.id = "videoSettings";
  container.appendChild(imageContainer);
  container.appendChild(title);
  container.appendChild(channel);
  container.appendChild(duration);
  container.appendChild(settings);
  videoList.appendChild(container);
}

function removeVideo(){
  var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlist",playlistNumber:currPlaylistNum});
  if(playlist.videos.length == 1){
    if(document.getElementById("playlistPageImageImage").src == "https://img.youtube.com/vi/"+playlist.videos[0].videoId+"/sddefault.jpg"){
      document.getElementById("playlistPageImageImage").src = "images/default_playlist_img.png";
      var childrenList = document.getElementById("playlistList").childNodes;
      childrenList[currPlaylistNum].childNodes[0].childNodes[0].src = "images/default_playlist_img.png";
    }
  }
  chrome.extension.getBackgroundPage().deleteVideo(videoIndexes[videoIndexToRemove], currPlaylistNum);
  videoIndexes[videoIndexToRemove] = -1;
  for(i = videoIndexToRemove + 1; i < videoIndexes.length; i++){
    videoIndexes[i]--;
  }
  containerToRemove.parentNode.removeChild(containerToRemove);
  document.getElementById("videoSettingsModal").style.display = "none";
  videoIndexToRemove = undefined;
  containerToRemove = undefined;
  document.getElementById("deleteVideoButton").removeEventListener("click", removeVideo);
}

function editVideo(){
  overlay.style.display = "block";
  document.getElementById("videoSettingsModal").style.display = "none";
  var video = chrome.extension.getBackgroundPage().getInfo({id:"video", playlistNumber:currPlaylistNum,videoNumber:videoIndexToRemove});
  var editVideoDiv = document.createElement("div");
  editVideoDiv.style.position = "absolute";
  editVideoDiv.style.border = "1px solid black";
  editVideoDiv.style.width = "500px";
  editVideoDiv.style.height = "500px";
  editVideoDiv.style.top = "100px";
  editVideoDiv.style.left = "50px";
  editVideoDiv.style.backgroundColor = "white";
  editVideoDiv.style.zIndex = "1000";
  //editVideoDiv.style.pointerEvents = "all";
  var titleInput = document.createElement("input");
  titleInput.style.position = "absolute";
  titleInput.style.border = "1px solid black";
  titleInput.style.width = "300px";
  titleInput.style.height = "50px";
  titleInput.style.top = "50px";
  titleInput.style.left = "25px";
  titleInput.value = video.videoTitle;
  var artistInput = document.createElement("input");
  artistInput.style.position = "absolute";
  artistInput.style.border = "1px solid black";
  artistInput.style.height = "50px";
  artistInput.style.width = "300px";
  artistInput.style.top = "100px";
  artistInput.style.left = "25px";
  artistInput.value = video.channelTitle;
  var cancelButton = document.createElement("div");
  cancelButton.style.position = "absolute";
  cancelButton.style.border = "1px solid black";
  cancelButton.style.height = "50px";
  cancelButton.style.width = "75px";
  cancelButton.style.top = "375px";
  cancelButton.style.left = "150px";
  cancelButton.innerHTML = "Cancel";
  cancelButton.onclick = function(){
    playlistPage.removeChild(editVideoDiv);
    containerToRemove = undefined;
    videoIndexToRemove = undefined;
    settingsIndex = undefined;
    overlay.style.display = "none";
  }
  var confirmButton = document.createElement("div");
  confirmButton.style.position = "absolute";
  confirmButton.style.border = "1px solid black";
  confirmButton.style.height = "50px";
  confirmButton.style.width = "75px";
  confirmButton.style.top = "375px";
  confirmButton.style.left = "250px";
  confirmButton.innerHTML = "Confirm";
  confirmButton.onclick = function(){
    containerToRemove.childNodes[1].innerHTML = titleInput.value;
    containerToRemove.childNodes[2].innerHTML = artistInput.value;
    chrome.extension.getBackgroundPage().editVideo(titleInput.value, artistInput.value, videoIndexes[videoIndexToRemove], currPlaylistNum);
    playlistPage.removeChild(editVideoDiv);
    containerToRemove = undefined;
    videoIndexToRemove = undefined;
    settingsIndex = undefined;
    overlay.style.display = "none";
  }
  editVideoDiv.appendChild(titleInput);
  editVideoDiv.appendChild(artistInput);
  editVideoDiv.appendChild(cancelButton);
  editVideoDiv.appendChild(confirmButton);
  playlistPage.appendChild(editVideoDiv);
}

function createPlaylistDiv(playlistObj){
  var numPlaylists = chrome.extension.getBackgroundPage().getInfo({id:"playlistCount"});
  var name, index, pic;
  if(playlistObj.containsPlaylist){
    name = playlistObj.playlist.name;
    index = playlistObj.index;
    if(playlistObj.playlist.videos.length > 0){
      if(playlistObj.playlist.image.slice(-31) == "images/default_playlist_img.png"){
        pic = "https://img.youtube.com/vi/"+playlistObj.playlist.videos[0].videoId+"/mqdefault.jpg";
      }
      else{
        pic = playlistObj.playlist.image;
      }
      
    }
    else{
      //pic = "images/default_playlist_img.png"
      pic = playlistObj.playlist.image;
    }
  }
  else{
    name = playlistObj.name;
    index = numPlaylists;
    pic = playlistObj.image;
  }
  
  var div = document.createElement("div");
  var tag = "Playlist " + index + ":" + name;
  div.id = tag;
  div.style.height = playlistDivHeight;
  div.style.width = playlistDivWidth;
  div.style.border = "1px solid black";
  div.style.position = "relative";
  div.style.float = "left";

  div.style.marginTop = "10px";
  div.style.marginLeft = "10px";
  if(index % 3 == 0){
    div.style.marginLeft = "15px";
  }
  
  div.style.overflow = "hidden";
  var imgContainer = document.createElement("div");
  imgContainer.style.height = playlistDivImgHeight;
  imgContainer.style.width = playlistDivWidth;
  imgContainer.style.overflow = "hidden";
  var img = document.createElement("img");
  img.src = pic;
  img.style.position = "relative";
  img.style.width = "110%";
  img.style.top = "-5%";
  img.style.left = "-5%";
  var titleContainer = document.createElement("div");
  titleContainer.style.height = "20px";
  titleContainer.style.width = playlistDivWidth;
  titleContainer.style.textAlign = "center";
  titleContainer.style.overflow = "hidden";
  if(playlistObj.containsPlaylist){
    titleContainer.innerHTML = playlistObj.playlist.name;
  }
  else{
    titleContainer.innerHTML = playlistObj.name;
  }
  if((playlistObj.containsPlaylist && playlistObj.playlist.videos.length == 0) ||
      !playlistObj.containsPlaylist){
    img.style.position = "relative";
    img.style.top = "-16.75%";
  }
  imgContainer.appendChild(img);
  div.appendChild(imgContainer);
  div.appendChild(titleContainer);
  
  div.onclick = function(e){
    currPlaylistId = tag;
    var playlistStr = "Playlist ";
    var start = playlistStr.length;
    var end = currPlaylistId.indexOf(":");
    currPlaylistNum = parseInt(currPlaylistId.slice(start, end));
    loadPlaylistPage(currPlaylistNum);
    homeButton.style.display = "block";
  }

  document.getElementById("playlistList").appendChild(div);
  //return {"tag": tag};
}

function addPlaylistDiv(name, description, image){
  //var returnVal = createPlaylistDiv({containsPlaylist: false, name: name});
  createPlaylistDiv({containsPlaylist: false, name: name, image:image});
  var videoCollection = [];
  var playlistObj = {
    name: name,
    //tag: returnVal.tag,
    image: image,
    description: description,
    videos: videoCollection
  };
  chrome.extension.getBackgroundPage().addPlaylist(playlistObj);
}

function displayPlaylists(){
  var numPlaylists = chrome.extension.getBackgroundPage().getInfo({id:"playlistCount"});
  var playlistCollection = chrome.extension.getBackgroundPage().getInfo({id:"playlistCollection"});
  for(i = 0; i < numPlaylists; i++){
    createPlaylistDiv({containsPlaylist: true, playlist: playlistCollection[i], index: i});
  }
}

function loadPlayerState(){
  var state = chrome.extension.getBackgroundPage().getInfo({id:"playerState"});
  if(state > 0 && state < 5){
    controlLoaded = true;
    document.getElementById("controls").classList.add("controlAnimation");
    if(state != 2){
      document.getElementById("controlsPlayButton").innerHTML = "Pause";
    }
    else{
      document.getElementById("controlsPlayButton").innerHTML = "Play";
    }
  }
  quality = chrome.extension.getBackgroundPage().getInfo({id:"quality"});
}

function setUpControlPanel(){
  var controlPanel = document.getElementById("controls");
  var videoImage = document.getElementById("controlsImage");
  var videoImage = document.getElementById("controlsImage");
  var title = document.getElementById("controlsVideoTitle");
  var artist = document.getElementById("controlsArtistTitle");
  var state = chrome.extension.getBackgroundPage().getInfo({id:"playerState"});

  var video = chrome.extension.getBackgroundPage().getInfo({id:"currVideoBeingPlayed"});

  if(typeof video != "undefined"){
    playlistPage.style.height = (515-50)+"px";
    var testForUndefined = document.getElementById("controlImage");
    if(testForUndefined != null){
      testForUndefined.parentNode.removeChild(testForUndefined);
    }
    var img = document.createElement("img");
    img.id = "controlImage";
    img.src = "https://img.youtube.com/vi/"+video.videoId+"/default.jpg";
    img.style.height = "inherit";
    videoImage.appendChild(img);
    title.innerHTML = video.videoTitle;
    artist.innerHTML = video.channelTitle;
  }
  
  var repeatOn = chrome.extension.getBackgroundPage().getInfo({id:"repeatStatus"});
  if(repeatOn){
    document.getElementById("controlsRepeatToggle").innerHTML = "Repeat On";
  }
  else{
    document.getElementById("controlsRepeatToggle").innerHTML = "Repeat Off";
  }
  var shuffleOn = chrome.extension.getBackgroundPage().getInfo({id:"shuffleStatus"});
  if(shuffleOn){
    document.getElementById("controlsShuffleToggle").innerHTML = "Shuffle On";
  }
  else{
    document.getElementById("controlsShuffleToggle").innerHTML = "Shuffle Off";
  }
  
  var volume = chrome.extension.getBackgroundPage().getVolume();
  volume = (volume / 100) * 75;
  document.getElementById("controlsVolumeBarVolumeDisplay").style.width = volume + "px";
}

function onload(){
  loadDivs();
  initListeners();
  loadUserInfo();
  //chrome.extension.getBackgroundPage().resetPlaylistCount();
  
  loadPlayerState();
  setUpControlPanel();
  displayPlaylists();
}

function err(data){
  chrome.extension.getBackgroundPage().console.error(data);
}

function log(data){
  //chrome.extension.getBackgroundPage().console.log(data);
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse){
  // When the background page finishes loading the video, then play the video
  if(message.request == "finishedLoading"){
    pagePlayerStatus = "ready";
    pagePlayer.playVideo();
  }
  else if(message.request == "finishedAddingVideo"){
    createVideoDiv(message.video, message.index);
    var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlist",playlistNumber:currPlaylistNum});
    if(playlist.videos.length == 1 && playlist.image.slice(-31) == "images/default_playlist_img.png"){
      document.getElementById("playlistPageImageImage").src = "https://img.youtube.com/vi/"+playlist.videos[0].videoId+"/sddefault.jpg";
      var childrenList = document.getElementById("playlistList").childNodes;
      childrenList[currPlaylistNum].childNodes[0].childNodes[0].src = "https://img.youtube.com/vi/"+playlist.videos[0].videoId+"/mqdefault.jpg";
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
    var list = document.getElementById("videoList");
    var listChildren = list.childNodes;
    if(typeof videoBeingPlayed != "undefined" && listChildren.length != 0){
      
      var order = chrome.extension.getBackgroundPage().getInfo({id:"order"});
      videoBeingPlayed.innerHTML = "Play";
      videoBeingPlayed = listChildren[order[message.videoIndex]].childNodes[0];
      videoBeingPlayed.innerHTML = "Pause";
    }
    playVideo(message.videoIndex, message.playlistIndex);
  }
  else if(message.request == "playPrevVideo"){
    var list = document.getElementById("videoList");
    var listChildren = list.childNodes;
    if(typeof videoBeingPlayed != "undefined" && listChildren.length != 0){
      var list = document.getElementById("videoList");
      var listChildren = list.childNodes;
      var order = chrome.extension.getBackgroundPage().getInfo({id:"order"});
      videoBeingPlayed.innerHTML = "Play";
      videoBeingPlayed = listChildren[order[message.videoIndex]].childNodes[0];
      videoBeingPlayed.innerHTML = "Pause";
    }
    playVideo(message.videoIndex, message.playlistIndex);
  }
  else if(message.request == "setControlImage"){
    var img = document.createElement("img");
    img.src = "https://img.youtube.com/vi/"+message.id+"/default.jpg";
    img.style.height = "inherit";
    document.getElementById("controlsImage").appendChild(img);
  }
  else if(message.request = "playlistEnded"){
    updatePlayPauseButtonStates(false);
  }
});

window.addEventListener("load", onload, false);