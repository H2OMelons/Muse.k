var port = chrome.runtime.connect();

const DEFAULT_IMG = -1;
const MQ_DEFAULT_IMG = 0;
const SD_DEFAULT_IMG = 1;

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

var volumeAdjuster;
var volumeBar;
var quality;

var qualityCheck = false;

var playlistInfo = {playingPlaylist: -1,
                    viewingPlaylist: -1,
                    playingPlaylistTag: undefined};

var videoListPlayButtons = [];

var tag = document.createElement('script');


function setupAPIs(){
  tag.src = "https://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

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
    }
    else if(pagePlayerStatus == "seeking"){
      pagePlayer.pauseVideo();
      pagePlayerStatus = "ready";
    }
    else if(pagePlayerStatus == "stopAfterBuffering"){
      pagePlayer.pauseVideo();      
    }
    else{
      chrome.extension.getBackgroundPage().playVideo();
      updatePlayPlaylistButton(true);
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
  };
  // Opens a window for the user to add a playlist and closes the window 
  // if clicked again
  addPlaylistButton.onclick = function(){
    displayPlaylistPopup(false);
  };
  // Clicks the create playlist button when user hits enter key
  searchInput.onkeyup = function(){
    if(event.keyCode == 13){
      searchButton.click();
    }
  };
  homeButton.onclick = function(){
    if(window.getComputedStyle(playlistContainer).display == "none"){
      playlistContainer.style.display = "block"; 
    }
    if(window.getComputedStyle(playlistPage).display != "none"){
      playlistPage.style.display = "none";     
      if(document.getElementById("playlistPageImage").style.display == "none"){
        document.getElementById("playlistPageImage").style.display = "block";
        document.getElementById("playlistPageIframe").style.display = "none";
      }
      else{
        document.getElementById("playlistPageImage").style.display = "block";
        currPlaylistPage = -1;
        
        document.getElementById("playlistPageIframe").style.display = "none";
      }
      
    }
    
    for(i = 0; i < videoListPlayButtons.length; i++){
      if(videoListPlayButtons[i] != null){
        videoListPlayButtons[i].parentNode.parentNode.removeChild(videoListPlayButtons[i].parentNode);
      }
    }
    
    playlistInfo.viewingPlaylist = -1;
    videoListPlayButtons = [];
    
    homeButton.style.display = "none";
  };
  deletePlaylistButton.onclick = function(){
    if(window.getComputedStyle(deletePlaylistPopup).display == "none"){
      overlay.style.display = "block";
      deletePlaylistPopup.style.display = "block"; 
    }
    else{
      overlay.style.display = "none";
      deletePlaylistPopup.style.display = "none";
    }
  };
  deletePlaylistPopupCancelButton.onclick = function(){
    overlay.style.display = "none";
    deletePlaylistPopup.style.display = "none";
  };
  
  deletePlaylistPopupConfirmButton.onclick = function(event){
    var retVal = chrome.extension.getBackgroundPage().deletePlaylist(playlistInfo.viewingPlaylist);
    if(typeof currPlaylistId != "undefined" && 
       (retVal == 1 || retVal == 0)){
      document.getElementById(currPlaylistId).parentNode.removeChild(document.getElementById(currPlaylistId));
      if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
        videoBeingPlayed = undefined;
        currVideoId = undefined;
        playlistInfo.playingPlaylist = -1;
      }
      currPlaylistId = undefined;
      playlistInfo.viewingPlaylist = -1;
      
      if(retVal == 0){
        document.getElementById("controls").classList.remove("controlAnimation");
        controls.top = "515px";
        controlLoaded = false;
      }
      
      for(i = 0; i < videoListPlayButtons.length; i++){
        videoListPlayButtons[i].parentNode.parentNode.removeChild(videoListPlayButtons[i].parentNode);
      }
      videoListPlayButtons = [];
      
      
      deletePlaylistPopup.style.display = "none";
      playlistPage.style.display = "none";
      playlistContainer.style.display = "block";
      overlay.style.display = "none";
      homeButton.style.display = "none";
      
      
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
      chrome.extension.getBackgroundPage().addVideoToPlaylist(playlistInfo.viewingPlaylist, videoId);
    }
    addVideoCancelButton.click();
  }
  addVideoCancelButton.onclick = function(){
    addVideoModal.style.display = "none";
    videoUrlInput.value = "";
    modalPlayer.stopVideo();
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
          updateControlPanelPlayButton(true);
          updatePlayPlaylistButton(true);
        }
        else{
          pagePlayer.playVideo();
        }
      }
    }
    else{
      if(pagePlayerStatus != "waitingForSync" &&
         (pagePlayer.getPlayerState() == YT.PlayerState.PLAYING ||
          chrome.extension.getBackgroundPage().getInfo({id:"playerState"}) == YT.PlayerState.PLAYING)){
        if(pagePlayer.getPlayerState() != YT.PlayerState.PLAYING){
          chrome.extension.getBackgroundPage().pauseVideo();
          updateControlPanelPlayButton(false);
          updatePlayPlaylistButton(false);
        }
        else{
          pagePlayer.pauseVideo();
        }
      }
    }
  }
  document.getElementById("controlsFastForwardButton").onclick = function(){
    if(chrome.extension.getBackgroundPage().getInfo({id:"playerState"}) == YT.PlayerState.PAUSED){
      if(chrome.extension.getBackgroundPage().queueHasNext()){
        updateControlPanelPlayButton(true);
      }
    }
    chrome.extension.getBackgroundPage().playNextInQueue();
  }
  document.getElementById("controlsRewindButton").onclick = function(){
    chrome.extension.getBackgroundPage().playPrevInQueue();
  }
  
  playPlaylistButton.onclick = function(){
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
      document.getElementById("playlistSetImageImage").src = defaultPlaylistImage;
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
    if(currPlaylistLoaded.videos.length > 0 && currPlaylistLoaded.image.slice(-31) == defaultPlaylistImage){
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
    document.getElementById("playlistSetImageImage").src = defaultPlaylistImage;
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
    currPlaylistLoaded.usingDefaultImage = false;
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
  var usingDefaultImage = (image.slice(-defaultPlaylistImage.length) == defaultPlaylistImage);
  addPlaylistDiv(userInput, description, image, usingDefaultImage);
  cancelCreateButton.click();
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
  var playlistLength = chrome.extension.getBackgroundPage().getQueueLength();
  var backgroundPlayerState = chrome.extension.getBackgroundPage().getInfo({id: "playerState"});
  if(playlistInfo.playingPlaylist != playlistInfo.viewingPlaylist){
    playPlaylistButton.innerHTML =  "Play";
  }
  else{
    if(backgroundPlayerState == YT.PlayerState.PLAYING){
      document.getElementById("playPlaylistButton").innerHTML = "Pause";
    }
    else if(backgroundPlayerState == YT.PlayerState.PAUSED){
      document.getElementById("playPlaylistButton").innerHTML = "Play";
    }
  }
  
  var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlist", playlistNumber: playlistNumber});
  currPlaylistLoaded = playlist;
  
  var botContainer = document.getElementById("botContainer");
  if(typeof playlist != "undefined"){
    chrome.extension.getBackgroundPage().setCurrPlaylistPage(playlistNumber);
    var videos = playlist.videos;
    var state = playlistLength > 0 && (backgroundPlayerState >= 0 && backgroundPlayerState < 5) &&
                (playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist);
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
      setPlayingPlaylist();
    }
    else{
      var img = document.getElementById("playlistPageImageImage");
      /*
      if(videos.length > 0){
        if(playlist.image.slice(-31) == defaultPlaylistImage){
          img.src = "https://img.youtube.com/vi/"+videos[0].videoId+"/sddefault.jpg";
        }
        else{
          img.src = playlist.image;
        }
      }
      else{
        img.src = playlist.image;
      }*/
      img.src = chrome.extension.getBackgroundPage().getPlaylistImage(playlistNumber, SD_DEFAULT_IMG);
      //document.getElementById("playlistPageImage").appendChild(img);
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
  }
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
    var list = document.getElementById("videoList");
    var listChildren = list.childNodes;
    videoBeingPlayed = listChildren[index].childNodes[0];
  }
  
  var queue = chrome.extension.getBackgroundPage().getQueue();

  if(shuffleOn){
    setupVideo(queue.playlist[queue.current].video, undefined, queue.playlist[queue.current].index);
  }
  else{
    //setupVideo(queue.playlist[queue.current].video, undefined, startingVideo);
    setupVideo(queue.playlist[queue.current].video, undefined, queue.playlist[queue.current].index);
  }
}

function createVideoDiv(video, index){
  var currPlaylistInfo = chrome.extension.getBackgroundPage().getPlaylistInfo();
  var videoIndex = chrome.extension.getBackgroundPage().getCurrVideoIndex();
  var container = document.createElement("div");
  container.classList.add("videoList", "container", "botBorder", "video");
  
  var imageContainer = document.createElement("div");
  imageContainer.classList.add("videoList", "imageContainer");

  if(videoIndex == index && playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
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
      setPlayingPlaylist();
      if(typeof videoBeingPlayed != "undefined"){
        // If another video is currently playing then change the button status
        videoBeingPlayed.innerHTML = "Play";
      }
      
      if(videoBeingPlayed == this && pagePlayer.getPlayerState() == YT.PlayerState.PAUSED){
        pagePlayer.playVideo();  
      }
      else{
        startPlaylist(index, playlistInfo.viewingPlaylist);
        videoBeingPlayed = imageContainer;
      }
      imageContainer.innerHTML = "Pause";
      
      

      if(!controlLoaded){
        document.getElementById("controls").classList.add("controlAnimation");
        controlLoaded = true;
      }
    }
    else{
      if(pagePlayer.getPlayerState() == YT.PlayerState.BUFFERING){
        imageContainer.innerHTML = "Play";
        pagePlayerStatus = "stopAfterBuffering";
      }
      else{
        pagePlayer.pauseVideo();
      }
    }
    
  };
  
  videoListPlayButtons.push(imageContainer);
  
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
  //var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlist",playlistNumber: playlistInfo.viewingPlaylist});
  var length = chrome.extension.getBackgroundPage().getPlaylistLength(playlistInfo.viewingPlaylist);
  if(length == 1){
    if(!chrome.extension.getBackgroundPage().getPlaylistUsingDefaultImage(playlistInfo.viewingPlaylist)){
      document.getElementById("playlistPageImageImage").src = defaultPlaylistImage;
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
  
  containerToRemove.parentNode.removeChild(containerToRemove);
  document.getElementById("videoSettingsModal").style.display = "none";
  videoIndexToRemove = undefined;
  containerToRemove = undefined;
  document.getElementById("deleteVideoButton").removeEventListener("click", removeVideo);
}

function editVideo(){
  overlay.style.display = "block";
  document.getElementById("videoSettingsModal").style.display = "none";
  var video = chrome.extension.getBackgroundPage().getInfo({id:"video",               
                                                            playlistNumber:playlistInfo.viewingPlaylist,
                                                            videoNumber:videoIndexToRemove});
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
    chrome.extension.getBackgroundPage().editVideo(titleInput.value, 
                                                   artistInput.value, 
                                                   videoIndexes[videoIndexToRemove], 
                                                   playlistInfo.viewingPlaylist);
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
    pic = chrome.extension.getBackgroundPage().getPlaylistImage(index, MQ_DEFAULT_IMG);
    /*
    if(playlistObj.playlist.videos.length > 0){
      if(playlistObj.playlist.image.slice(-31) == defaultPlaylistImage){
        pic = "https://img.youtube.com/vi/"+playlistObj.playlist.videos[0].videoId+"/mqdefault.jpg";
      }
      else{
        pic = playlistObj.playlist.image;
      }
      
    }
    else{
      pic = playlistObj.playlist.image;
    }*/
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

    playlistInfo.viewingPlaylist = index;
    loadPlaylistPage(playlistInfo.viewingPlaylist);
    homeButton.style.display = "block";
  }

  document.getElementById("playlistList").appendChild(div);
}

function addPlaylistDiv(name, description, image, usingDefaultImage){
  var uid = new Date().getTime().toString();
  createPlaylistDiv({containsPlaylist: false, name: name, image:image});
  var videoCollection = [];
  var playlistObj = {
    name: name,
    image: image,
    usingDefaultImage: usingDefaultImage,
    description: description,
    videos: videoCollection,
    uid: uid,
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
    //controlLoaded = true;
    //document.getElementById("controls").classList.add("controlAnimation");
    var queue = chrome.extension.getBackgroundPage().getQueue();
    updateControlPanel(queue.playlist[queue.current].video);
    
    if(state != 2){
      document.getElementById("controlsPlayButton").innerHTML = "Pause";
    }
    else{
      document.getElementById("controlsPlayButton").innerHTML = "Play";
    }
    playlistInfo.playingPlaylist = chrome.extension.getBackgroundPage().getPlaylistInfo().playingPlaylist;
  }
  quality = chrome.extension.getBackgroundPage().getInfo({id:"quality"});
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

function displayIframe(on){
  if(on){
    if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist && 
       window.getComputedStyle(document.getElementById("playlistPageIframe")).display == "none"){
      document.getElementById("playlistPageImage").style.display = "none";
      document.getElementById("playlistPageIframe").style.display = "block";
    }
  }
  else{
    if(window.getComputedStyle(document.getElementById("playlistPageIframe")).display == "block"){
      document.getElementById("playlistPageImage").style.display = "block";
      document.getElementById("playlistPageIframe").style.display = "none";
    }
  }
}

function setupControlPanel(){
  document.getElementById("controls").classList.add("controlAnimation");
  playlistPage.style.height = (515-50)+"px";
  
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
  
  controlLoaded = true;
}

function updateVideoListPlayButtons(updateToPlay, updateToPause){
  if(typeof updateToPlay != "undefined"){
    videoListPlayButtons[updateToPlay].innerHTML = "Play";
  }
  if(typeof updateToPause != "undefined"){
    videoListPlayButtons[updateToPause].innerHTML = "Pause";
  }  
}

function updateControlPanelPlayButton(playing){
  if(playing){
    document.getElementById("controlsPlayButton").innerHTML = "Pause";
  }
  else{
    document.getElementById("controlsPlayButton").innerHTML = "Play";
  }
}

function updatePlayPlaylistButton(playing){
  if(playing && playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
    playPlaylistButton.innerHTML = "Pause";
  }
  else{
    playPlaylistButton.innerHTML = "Play";
  }
}

function updateControlPanel(video){
  
  if(!controlLoaded){
    setupControlPanel();
  }
  
  var videoImage = document.getElementById("controlsImageImage");
  videoImage.src = "https://img.youtube.com/vi/"+video.videoId+"/default.jpg";
  var title = document.getElementById("controlsVideoTitle");
  title.innerHTML = video.videoTitle;
  var artist = document.getElementById("controlsArtistTitle");
  artist.innerHTML = video.channelTitle;
}

function updatePlayistPageImage(){
  document.getElementById("playlistPageImageImage").src = 
    chrome.extension.getBackgroundPage().getPlaylistImage(playlistInfo.viewingPlaylist, SD_DEFAULT_IMG);
}

function updatePlaylistDivImage(playlistIndex){
  document.getElementById("playlistList").childNodes[playlistInfo.viewingPlaylist].childNodes[0].childNodes[0].src = 
        chrome.extension.getBackgroundPage().getPlaylistImage(playlistInfo.viewingPlaylist, MQ_DEFAULT_IMG);
}

function play(video){
  if(video.videoId != currVideoId){
    pagePlayerStatus = "waitingForSync";
    pagePlayer.loadVideoById(video.videoId, 0, quality);
    chrome.extension.getBackgroundPage().createVideo(video.videoId);
    currVideoId = video.videoId;
  }
  else{
    pagePlayer.seekTo(0);
    chrome.extension.getBackgroundPage().seekTo(0);
    pagePlayer.playVideo();
  }
}

function onload(){
  setupAPIs();
  loadDivs();
  initListeners();
  loadUserInfo();
  
  loadPlayerState();
  displayPlaylists();
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
  else if(message.request == "finishedAddingVideo"){
    createVideoDiv(message.video, message.index);
    if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
      chrome.extension.getBackgroundPage().addToQueue(message.video, videoListPlayButtons.length - 1);
    }
    if(chrome.extension.getBackgroundPage().getPlaylistLength(playlistInfo.viewingPlaylist) == 1){
      document.getElementById("playlistPageImageImage").src = 
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