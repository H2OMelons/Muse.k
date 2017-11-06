var port = chrome.runtime.connect();

const DEFAULT_IMG = -1;
const MQ_DEFAULT_IMG = 0;
const SD_DEFAULT_IMG = 1;
const KEYCODE_ENTER = 13;

var defaultPlaylistImage = "images/default_playlist_img.png";
var i;

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
var importOtherUrlInput;

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

/**
 *------------------------------------------------------------------
 * PlaylistGenerator object that has functions to create playlists
 * and display the playlists 
 *------------------------------------------------------------------
 */

function PlaylistGenerator(){
  
}

/**
 * @param playlistList - The list of playlists to process
 * @param importChoices - Array that holds boolean values to see which playlist to process.
 *                        If undefined, process all playlists
 * @param callback - The function to call when everything is done processing
 */
PlaylistGenerator.prototype.processRawPlaylistList = function(playlistList, importChoices, callback){
  var numProcessedPlaylists = 0;
  var totalPlaylists = 0;
  
  if(typeof importChoices == "undefined"){
    totalPlaylists = playlistList.length;
  }
  else{
    for(i = 0; i < importChoices.length; i++){
      if(importChoices[i]){
        totalPlaylists++;
      }
    }
  }
  
  for(i = 0; i < playlistList.length; i++){
    if(typeof importChoices == "undefined" || importChoices[i]){
      this.processRawPlaylist(playlistList[i], function(){
        numProcessedPlaylists++;
        if(numProcessedPlaylists == totalPlaylists){
          callback();
        }
      });
    }
  }
}

/**
 * @params playlist - The playlist data that we want to process
 * @params callback - The function to call after this function finishes
 *
 * Uses the info from playlist to create a list of raw videos and gives it to
 * processRawVideoList
 */

PlaylistGenerator.prototype.processRawPlaylist = function(playlist, callback){
  chrome.extension.getBackgroundPage().retrieveFullPlaylist(playlist.id, function(videoResults){
    playlistGenerator.processRawVideoList(videoResults, playlist.snippet.title, callback);
  });
}

/**
 * @param videoResults - The raw video list to convert 
 * @param title - The title of the playlist
 * @param callback - The function to call when everything is finished
 *
 * Takes the raw video list and converts it to a list of videos in the format for this program
 * then calls generateNewPlaylist to make the actual playlist
 */

PlaylistGenerator.prototype.processRawVideoList = function(videoResults, title, callback){
  var videos = [];
  var numCompleted = 0;
  for(i = 0; i < videoResults.length; i++){
    chrome.extension.getBackgroundPage().createVideo(videoResults[i].snippet.resourceId.videoId, function(video){
      if(typeof video != "undefined"){
        videos.push(video);
      }
      numCompleted++;
      if(numCompleted == videoResults.length){
        playlistGenerator.generateNewPlaylist(videos, title, undefined, callback);
      }
    });
  }
}

/**
 * @param videos - The list of videos 
 * @param filter - Contains a list of booleans saying which videos we should filter out of the list
 *
 * If filter is undefined, then return videos. If filter is defined, then remove all videos from the list of videos
 * that have been filtered out
 */
PlaylistGenerator.prototype.filterVideoList = function(videos, filter){
  if(typeof filter == "undefined"){
    return videos;
  }
  
  for(i = videos.length - 1; i >= 0; i--){
    if(!filter[i]){
      videos.splice(i, 1);
    }
  }
  return videos;
}

/**
 * @param videos - A list of the videos that belongs to this playlist
 * @param name - The name of this playlist
 * @param img - The image for the playlist
 * @param callback - The function to call when this function is finished
 *
 * Creates the playlist object using the given parameters (when the given paramter is undefined,
 * uses a default value), adds the playlist object the the playlist collection and calls
 * displayPlaylist() to create the actual playlist div
 */

PlaylistGenerator.prototype.generateNewPlaylist = function(videos, name, img, callback){
  var usingDefaultImg = false;
  // If any of the given parameters are undefined then set them to be the default values
  if(typeof videos == "undefined"){
    videos = [];     
  }
  if(typeof name == "undefined"){
    name = "New Playlist";
  }
  if(typeof img == "undefined"){
    img = "images/default_playlist_img.png";
    usingDefaultImg = true;
  }
  var uid = new Date().getTime().toString();
  var playlistObj = {
    name: name,
    image: img,
    usingDefaultImage: usingDefaultImg,
    videos: videos,
    uid: uid
  }
  
  chrome.extension.getBackgroundPage().addPlaylist(playlistObj);
  
  this.displayPlaylist(playlistObj, callback);
}

/**
 * @param playlistObj - Contains name, image, usingDefaultImage, videos, and uid
 *                      of the playlist
 * @param callback - The function to call when finished making the div 
 *
 * Creates the playlist div you see on the left hand column. When finished, will 
 * call the given callback function if available
 */
PlaylistGenerator.prototype.displayPlaylist = function(playlistObj, callback){
  var name = playlistObj.name;
  var index = chrome.extension.getBackgroundPage().getInfo({id:"playlistCount"}) - 1;
  var pic = chrome.extension.getBackgroundPage().getPlaylistImageByUid(playlistObj.uid, MQ_DEFAULT_IMG);
  
  var div = document.createElement("div");
  //var tag = "Playlist " + index + ":" + name;
  var tag = "Playlist " + playlistObj.uid + ":" + name;
  div.id = tag;
  div.classList.add("border-bottom", "playlist-div", "button");
  
  var titleContainer = document.createElement("div");
  titleContainer.classList.add("regular-font", "playlist-div-info");
  titleContainer.innerHTML = playlistObj.name;
  var infoContainer = document.createElement("div");
  infoContainer.classList.add("tiny-font", "playlist-div-info");
  
  var numVideos = playlistObj.videos.length;
  
  var j = 0;
  for(j = 0; j < playlistObj.videos.length; j++){
    if(playlistObj.videos[j] == -1){
      numVideos--;
    }
  }
  
  infoContainer.innerHTML = numVideos + " Videos";
  
  infoContainer.style.lineHeight = "150%";
  
  div.onclick = function(e){
    if(e.clientX < 290){
      if(playlistObj.uid != playlistInfo.viewingPlaylist){

        for(i = 0; i < videoListPlayButtons.length; i++){
          if(videoListPlayButtons[i] != null){
            videoListPlayButtons[i].parentNode.parentNode.removeChild(videoListPlayButtons[i].parentNode);
          }
        }

        videoListPlayButtons = [];

        currPlaylistId = tag;
        playlistInfo.viewingPlaylist = playlistObj.uid;
        loadPlaylistPageByUid(playlistObj.uid);
      } 
    }
    else{
      var playlist = chrome.extension.getBackgroundPage().getPlaylistByUid(playlistObj.uid);
      editPlaylistId = tag;
      playlistInfo.editingPlaylist = playlistObj.uid;
      currPlaylistLoaded = playlist;
    }
  }
  
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
    var uid = 0;
    for(i = 0; i < e.path.length; i++){
      if(e.path[i].id.includes("Playlist")){
        var end = e.path[i].id.indexOf(":");
        uid = parseInt(e.path[i].id.slice(start, end))
        i = e.path.length;
      }
    }
    displayPlaylistPopup(true, uid);
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
  
  if(callback){
    callback();
  }
}

/*
 *------------------------------------------------------------------
 */

var playlistGenerator = new PlaylistGenerator();

function loadPlaylistPageByUid(uid){
  if(window.getComputedStyle(document.getElementById("video-bar")).display == "none"){
    document.getElementById("video-bar").style.display = "block";
  }
  
  // Get info about the current video being played from the background page
  var playlistLength = chrome.extension.getBackgroundPage().getQueueLength();
  var backgroundPlayerState = chrome.extension.getBackgroundPage().getPlayerState();
  
  //var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlist", playlistNumber: playlistNumber});
  var playlist = chrome.extension.getBackgroundPage().getPlaylistByUid(uid);
  currPlaylistLoaded = playlist;
  
  if(typeof playlist != "undefined"){
    chrome.extension.getBackgroundPage().setViewingPlaylist(uid);
    var videos = playlist.videos;
    var state = playlistLength > 0 && (backgroundPlayerState >= 0 && backgroundPlayerState < 5);
    
    // Check to see if there is a video playing/loaded in the background
    if(state){
      if(window.getComputedStyle(document.getElementById("player")).display != "block"){
        document.getElementById("player").style.display = "block";
        document.getElementById("playerImage").style.display = "none";
        if(backgroundPlayerState == YT.PlayerState.PLAYING &&
           pagePlayer.getPlayerState() != YT.PlayerState.PLAYING){
          // If there is a video playing in the background and there is no video being played in the
          // foreground then seek to the same position in the page player and play the video
          pagePlayerStatus = "pagePlayerSeeking";
          pagePlayer.seekTo(chrome.extension.getBackgroundPage().getCurrentTime() + 5);    
        }
        else if(backgroundPlayerState == YT.PlayerState.PLAYING &&
                pagePlayer.getPlayerState() == YT.PlayerState.PLAYING){

        }
        else if(backgroundPlayerState == YT.PlayerState.PAUSED && 
                pagePlayer.getPlayerState() == YT.PlayerState.PAUSED){

        }
        else{
          // If there is a video loaded but not playing in the background and there is no video 
          // loaded in the foreground then seek to the same position in the foreground
          pagePlayerStatus = "seeking";
          pagePlayer.seekTo(chrome.extension.getBackgroundPage().getCurrentTime());
        }
        setPlayingPlaylist();
      }
    }
    else{
      // If there is no video being played then display the image for the playlist
      var img = document.getElementById("player-image-image");
      img.src = chrome.extension.getBackgroundPage().getPlaylistImageByUid(uid, SD_DEFAULT_IMG);
      document.getElementById("player").style.display = "none";
      document.getElementById("playerImage").style.display = "block";
    }
    displayPlaylistVideoThumbnails(playlist);
  }
  else{
    chrome.extension.getBackgroundPage().setViewingPlaylist(undefined);
  }
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
      var video = chrome.extension.getBackgroundPage().getCurrVideo();
      if(typeof video != "undefined" || typeof video.startTime != "undefined"){
        pagePlayer.seekTo(video.startTime);
        initTimeBar(video.startTime, pagePlayer.getDuration());
      }
      else{
        pagePlayer.seekTo(0);
        initTimeBar(0, pagePlayer.getDuration());
      }
      pagePlayer.pauseVideo();
      
      stopTimeBar();
      
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
    else if(pagePlayerStatus == "pagePlayerSeeking"){
      var pagePlayerTime = Math.floor(pagePlayer.getCurrentTime());
      var backgroundPlayerTime = Math.floor(chrome.extension.getBackgroundPage().getCurrentTime());
      if(pagePlayerTime >= backgroundPlayerTime){
        pagePlayer.seekTo(chrome.extension.getBackgroundPage().getCurrentTime());
        pagePlayerStatus = "finalSeek";
      }
      else{
        pagePlayer.seekTo(backgroundPlayerTime + 2);
      }
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
    
    updateControlPanelPlayButton(false);
  }
  else if(event.data == YT.PlayerState.BUFFERING){
    if(pagePlayerStatus == "finalSeek"){
      pagePlayerStatus = "ready";
    }
    else if(pagePlayerStatus != "waitingForSync" && pagePlayerStatus != "pagePlayerSeeking"){
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
      chrome.extension.getBackgroundPage().addVideoToPlaylistByUid(playlistInfo.viewingPlaylist, videoId);
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
      if(playlistInfo.viewingPlaylist == playlistInfo.editingPlaylist &&
         window.getComputedStyle(document.getElementById("playerImage")).display != "none"){
        document.getElementById("playerImage").style.display = "none";
        document.getElementById("video-bar").style.display = "none";
        for(i = 0; i < videoListPlayButtons.length; i++){
          videoListPlayButtons[i].parentNode.parentNode.removeChild(videoListPlayButtons[i].parentNode);
        }
        videoListPlayButtons = [];
      }
      editPlaylistId = undefined;
      playlistInfo.editingPlaylist = -1;
      
      
      
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
    chrome.identity.getAuthToken({'interactive' : true}, function(token){
      document.getElementById("signin-ui").style.display = "none";
      if(chrome.runtime.lastError){
        document.getElementById("try-again").style.display = "block";
      }
      else{
        chrome.extension.getBackgroundPage().setToken({access_token: token});
        document.getElementById("url-or-display-all-selection-container").style.display = "block";
        document.getElementById("url-selection-button-container").style.display = "block";
      }
    });
  }
  
  document.getElementById("try-again-button").onclick = function(){
    chrome.identity.getAuthToken({'interactive': true}, function(token){
      if(chrome.runtime.lastError){
        
      }
      else{
        chrome.extension.getBackgroundPage().setToken({access_token: token});
        document.getElementById("try-again").style.display = "none";
        document.getElementById("url-or-display-all-selection-container").style.display = "block";
        document.getElementById("url-selection-button-container").style.display = "block";
      }
    });
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
  
  var logout = false;
  
  importUser.onclick = function(){
    if(currSelection != 2){
      currSelection = 2;
      setImportDisplay({border: "0px solid gray", display: "none"},
                       {border: "2px solid gray", display: "block"},
                       {border: "0px solid gray", display: "none"});
      chrome.identity.getAuthToken({'interactive' : false}, function(token){
        if(chrome.runtime.lastError){
          document.getElementById("signin-ui").style.display = "block";
          document.getElementById("try-again").style.display = "none";
          document.getElementById("url-or-display-all-selection-container").style.display = "none";
          document.getElementById("url-selection-container").style.display = "none";
          document.getElementById("display-all-selection-container").style.display = "none";
          document.getElementById("display-all-selection-results-buttons").style.display = "none";
          document.getElementById("url-selection-results-button").style.display = "none";
          document.getElementById("url-selection-results-cancel-button").style.display = "none";
        }
        else{
          chrome.extension.getBackgroundPage().setToken({access_token: token});
          if(logout){
            chrome.identity.removeCachedAuthToken({'token': token}, function(){
              log("success");
            });
          }
          // Display 2 button choices: import by url and display all playlists
          document.getElementById("url-or-display-all-selection-container").style.display = "block";
          document.getElementById("url-selection-url-input").value = "";
          document.getElementById("url-selection-button-container").style.display = "block";
          document.getElementById("url-selection-container").style.display = "none";
          document.getElementById("display-all-selection-container").style.display = "none";
          document.getElementById("display-all-selection-results-buttons").style.display = "none";
          document.getElementById("url-selection-results-button").style.display = "none";
          document.getElementById("url-selection-results-cancel-button").style.display = "none";
        }
      });
    }
  };
  
  document.getElementById("url-selection-button").onclick = function(){
    document.getElementById("url-selection-button-container").style.display = "none";
    document.getElementById("url-selection-container").style.display = "block";
  };
  
  var userPlaylistResults = [];
  var userImportChoices = [];
  /**
   * newResults-If true then we want to remove all previous results that were displayed and if false 
   *            we don't remove the displayed results
   */
  function displayAllPlaylistResults(results, newResults){
    var container = document.getElementById("display-all-selection-results-container");
    
    if(newResults){
      userPlaylistResults = [];
      userImportChoices = [];
      while(container.firstChild){
        container.removeChild(container.firstChild);
      }
    }
    
    var offset = userPlaylistResults.length;
    
    // If there is a next page token, then get the next page of results
    for(i = 0; i < results.items.length; i++){
      userPlaylistResults.push(results.items[i]);
      userImportChoices.push(false);
      var div = document.createElement("div");
      var img = document.createElement("img");
      img.src = results.items[i].snippet.thumbnails.default.url;
      div.classList.add("display-all-selection-result");
      div.appendChild(img);
      div.id = offset + i;
      var span = document.createElement("span");
      span.classList.add("fa-stack");
      span.style.position = "absolute";
      span.style.top = "5px";
      span.style.left = "5px";
      span.style.display = "none";
      var innerCircle = document.createElement("i");
      innerCircle.classList.add("fa", "fa-circle", "fa-stack-2x");
      innerCircle.style.color = "#c0ffc0";
      var outerCircle = document.createElement("i");
      outerCircle.classList.add("fa", "fa-circle-thin", "fa-stack-2x");
      outerCircle.style.color = "#40c040";
      var check = document.createElement("i");
      check.classList.add("fa", "fa-check", "fa-stack-1x");
      span.appendChild(innerCircle);
      span.appendChild(outerCircle);
      span.appendChild(check);
      div.appendChild(span);
      
      div.onclick = function(e){
        var id = parseInt(e.path[1].id);
        if(window.getComputedStyle(e.path[1].childNodes[1]).display == "none"){
          e.path[1].childNodes[1].style.display = "block";
          userImportChoices[id] = true;
        }
        else{
          e.path[1].childNodes[1].style.display = "none";
          userImportChoices[id] = false;
        }        
      }
      
      container.appendChild(div);
    }
    document.getElementById("url-selection-load").style.display = "none";
    document.getElementById("display-all-selection-results-buttons").style.display = "block";
  }
  
  document.getElementById("display-all-selection-button").onclick = function(){
    document.getElementById("url-selection-button-container").style.display = "none";
    document.getElementById("display-all-selection-container").style.display = "block";
    document.getElementById("url-selection-load").style.display = "block";
    chrome.extension.getBackgroundPage().requestPlaylists(function(response){
      
      if(chrome.runtime.lastError){
        document.getElementById("url-selection-load").style.display = "none";
      }
      else{
        var results = [response];
        displayAllPlaylistResults(response, true);
      }
    });
  };
  
  document.getElementById("display-all-selection-import-all-button").onclick = function(){
    
  };
  
  document.getElementById("display-all-selection-import-button").onclick = function(){
    
    for(i = 0; i < userImportChoices.length; i++){
      if(userImportChoices[i]){
        document.getElementById("url-selection-load").style.display = "block";
        playlistGenerator.processRawPlaylistList(userPlaylistResults, userImportChoices, function(){
          document.getElementById("url-selection-load").style.display = "none";
          document.getElementById("url-selection-success").style.display = "block";
          var playlistNodes = document.getElementById("display-all-selection-results-container").childNodes;
          
          for(i = 0; i < playlistNodes.length; i++){
            playlistNodes[i].childNodes[1].style.display = "none";
          }
        });
        i = userImportChoices.length;
      }
    }
    
  };
  
  document.getElementById("url-selection-continue-button").onclick = function(){
    document.getElementById("url-selection-success").style.display = "none";
    for(i = 0; i < userImportChoices.length; i++){
      userImportChoices[i] = false;
    }
  }
  
  document.getElementById("display-all-selection-cancel-button").onclick = function(){
    playlistPopup.dispatchEvent(cancelEvent);
  };
  
  
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
  
  function nextPlaylistPage(results, id, container, type){
    chrome.extension.getBackgroundPage().getPlaylistByIdNextPage(id, 
                                                                 results[results.length - 1].nextPageToken,
                                                                 function(response){
      if(response.error){
        if(type == "url-selection"){
          document.getElementById("url-selection-load").style.display = "none";
        }
        else if(type == "import-other"){
          document.getElementById("import-other-load").style.display = "none";
        }
      }
      else{
        results.push(response);
        if(response.nextPageToken){
          nextPlaylistPage(results, id, container, type);
        }
        else{
          displayPlaylistResults(results, container, type);
        }
      }
    });
  }
  
  var importList = [];
  var resultsList = [];
  function displayPlaylistResults(results, container, type){
    // Reset the importList and resultsList
    importList = [];
    resultsList = [];
    // Reset the results container so that the previous results aren't shown with the current results
    //var container = document.getElementById("import-other-results");
    while(container.firstChild){
      container.removeChild(container.firstChild);
    }
    // Display the names of the videos along with a checkbox for the user to include it in the import or not
    for(i = 0; i < results.length; i++){
      var j;
      for(j = 0; j < results[i].items.length; j++){
        importList.push(true);
        resultsList.push(results[i].items[j]);
        var id = importList.length - 1;
        createResultDisplay(id, results[i].items[j].snippet.title, container);
      }
      
    }
    // Turn off the loading animation when done displaying the results
    container.style.display = "block";
    
    if(type == "url-selection"){
      
      document.getElementById("url-selection-load").style.display = "none";
    }
    else if(type == "import-other"){
      document.getElementById("import-other-results-button").style.display = "block";
      document.getElementById("import-other-results-cancel-button").style.display = "block";
      document.getElementById("import-other-load").style.display = "none";
    }
    
    
  }
  
  function createResultDisplay(id, videoTitle, container){
    var resultsDisplay = document.createElement("div");
    var checkBox = document.createElement("input");
    var title = document.createElement("div");
    title.style.height = "inherit";
    title.style.position = "absolute";
    title.style.left = "20px";
    resultsDisplay.classList.add("import-other-results-display-container");
    checkBox.classList.add("float-left");
    title.classList.add("float-left");
    checkBox.type = "checkbox";
    checkBox.id = id;
    checkBox.checked = true;
    checkBox.onchange = function(){
      if(checkBox.checked){
        importList[parseInt(checkBox.id)] = true;
      }
      else{
        importList[parseInt(checkBox.id)] = false;
      }
    }
    resultsDisplay.appendChild(checkBox);
    title.innerHTML = videoTitle;
    resultsDisplay.appendChild(title);
    //document.getElementById("import-other-results").appendChild(resultsDisplay);
    container.appendChild(resultsDisplay);
    
    resultsDisplay.onclick = function(e){
      if(e.path[0] == this){
        checkBox.click();
      }
    }
    
  }
  
  document.getElementById("import-other-results-button").onclick = function(){
    document.getElementById("import-other-load").style.display = "block";
    document.getElementById("import-other-results-button").style.display = "none";
    document.getElementById("import-other-results-cancel-button").style.display = "none";
    document.getElementById("import-other-results").style.display = "none";
    var filteredVideoList = playlistGenerator.filterVideoList(resultsList, importList);
    playlistGenerator.processRawVideoList(filteredVideoList, undefined, function(){
      document.getElementById("import-other-load").style.display = "none";
      document.getElementById("import-other-success").style.display = "block";
      document.getElementById("import-other-url-input").style.display = "none";
    });
  }
  
  document.getElementById("url-selection-results-button").onclick = function(){
    document.getElementById("url-selection-load").style.display = "none";
    document.getElementById("url-selection-results-button").style.display = "none";
    document.getElementById("url-selection-results-cancel-button").style.display = "none";
    document.getElementById("url-selection-results-container").style.display = "none";
    var filteredVideoList = playlistGenerator.filterVideoList(resultsList, importList);
    playlistGenerator.processRawVideoList(filteredVideoList, undefined, function(){
      document.getElementById("url-selection-load").style.display = "none";
      document.getElementById("url-selection-success").style.display = "block";
    });
  }
  
  
  document.getElementById("import-other-results-cancel-button").onclick = function(){
    playlistPopup.dispatchEvent(cancelEvent);
  }
  
  document.getElementById("url-selection-results-cancel-button").onclick = function(){
    playlistPopup.dispatchEvent(cancelEvent);
  }
  
  function clearImportList(){
    var container = document.getElementById("import-other-results");
    while(container.firstChild){
      container.removeChild(container.firstChild);
    }
    document.getElementById("import-other-results-cancel-button").style.display = "none";
    document.getElementById("import-other-results-button").style.display = "none";
    container.style.display = "none";
  }
  
  document.getElementById("import-other-success-exit-button").onclick = function(){
    playlistPopup.dispatchEvent(cancelEvent);
  }
  
  document.getElementById("import-other-success-import-again-button").onclick = function(){
    var urlInput = document.getElementById("import-other-url-input");
    urlInput.style.display = "block";
    urlInput.value = "";
    urlInput.focus();
    document.getElementById("import-other-success").style.display = "none";
  }
  
  importOtherUrlInput.onkeyup = function(){
    if(event.keyCode == KEYCODE_ENTER){
      var input = importOtherUrlInput.value;
      var type = "list=";
      var startIndex = input.indexOf(type) + type.length;
      var id = input.slice(startIndex, startIndex + 34);
      if(startIndex != -1 && id.length == 34 && !id.includes("&")){
        if(window.getComputedStyle(document.getElementById("import-other-error")).display != "none"){
          document.getElementById("import-other-error").style.display = "none";
        }
        
        // Start the loading animation
        document.getElementById("import-other-load").style.display = "block";
        
        // If the given url is valid then make an api call for it
        chrome.extension.getBackgroundPage().getPlaylistById(id, function(response){
          // If there is an error, then display the error message for the user
          if(response.error){
            document.getElementById("import-other-error").style.display = "block";
            document.getElementById("invalid-url-error").style.display = "none";
            document.getElementById("import-other-api-error").style.display = "block";
            document.getElementById("import-other-load").style.display = "none";
            if(response.error.code == 403){
              document.getElementById("import-other-api-error-msg").innerHTML = "You do not have access to this private playlist";
            }
            else{
              document.getElementById("import-other-api-error-msg").innerHTML = response.error.message;
            }
            
          }
          // If there is no error then obtain all the videos in the playlist in order to display them for the
          // user to select 
          else{
            var results = [];
            results.push(response);
            if(response.nextPageToken){
              nextPlaylistPage(results, id, document.getElementById("import-other-results"), "import-other");
            }
            else{
              displayPlaylistResults(results, document.getElementById("import-other-results"), "import-other");
            }
          }
        });
      }
      else{
        // If the given url is invalid then display an error message
        document.getElementById("import-other-error").style.display = "block";
        document.getElementById("invalid-url-error").style.display = "block";
        document.getElementById("import-other-api-error").style.display = "none";
      }
    }
  }
  
  document.getElementById("url-selection-url-input").onkeyup = function(){
    if(event.keyCode == KEYCODE_ENTER){
      var input = document.getElementById("url-selection-url-input").value;
      var type = "list=";
      var startIndex = input.indexOf(type) + type.length;
      var id = input.slice(startIndex, startIndex + 34);
      if(startIndex != -1 && id.length == 34 && !id.includes("&")){
        if(window.getComputedStyle(document.getElementById("url-selection-error")).display != "none"){
          document.getElementById("url-selection-error").style.display = "none";
        }
        
        // Start the loading animation
        document.getElementById("url-selection-load").style.display = "block";
        
        // If the given url is valid then make an api call for it
        chrome.extension.getBackgroundPage().getPlaylistById(id, function(response){
          // If there is an error, then display the error message for the user
          if(response.error){
            document.getElementById("url-selection-error").style.display = "block";
            document.getElementById("url-selection-invalid-url-error").style.display = "none";
            document.getElementById("url-selection-api-error").style.display = "block";
            document.getElementById("url-selection-load").style.display = "none";
            if(response.error.code == 403){
              document.getElementById("url-selection-api-error-msg").innerHTML = "You do not have access to this private playlist";
            }
            else{
              document.getElementById("url-selection-api-error-msg").innerHTML = response.error.message;
            }
            
          }
          // If there is no error then obtain all the videos in the playlist in order to display them for the
          // user to select 
          else{
            var results = [];
            results.push(response);
            document.getElementById("url-selection-results-button").style.display = "block";
            document.getElementById("url-selection-results-cancel-button").style.display = "block";
            if(response.nextPageToken){
              nextPlaylistPage(results, id, document.getElementById("url-selection-results-container"), "url-selection");
            }
            else{
              displayPlaylistResults(results, document.getElementById("url-selection-results-container"), "url-selection");
            }
          }
        });
      }
      else{
        document.getElementById("url-selection-error").style.display = "block";
        document.getElementById("url-selection-invalid-url-error").style.display = "block";
        document.getElementById("url-selection-api-error").style.display = "none";
      }
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
    document.getElementById("import-other-url-input").style.display = "block";
    document.getElementById("import-other-url-input").value = "";
    document.getElementById("import-other-load").style.display = "none";
    document.getElementById("import-other-success").style.display = "none";
    clearImportList();
    cancelCreateButton.click();
  });
  
  addVideoModal.addEventListener("cancel", function(){
    addVideoCancelButton.click();
  });
  
  document.getElementById("settings-container").addEventListener("cancel", function(){
    document.getElementById("settings-button").click();
  });
  
  document.getElementById("edit-video-modal").addEventListener("cancel", function(){
    cancelButton.click();
  });
  
  document.getElementById("edit-video-modal").onkeypress = function(){
    if(event.keyCode == KEYCODE_ENTER){
      document.getElementById("edit-video-confirm-button").click();
    }
  };
  
  document.getElementById("edit-video-cancel-button").onclick = function(){
    containerToRemove = undefined;
    videoIndexToRemove = undefined;
    settingsIndex = undefined;
    overlay.style.display = "none";
    document.getElementById("edit-video-modal").style.display = "none";
  }
  
  document.getElementById("edit-video-confirm-button").onclick = function(){
    var titleInput = document.getElementById("edit-title-input");
    var artistInput = document.getElementById("edit-artist-input");
    var startMin = document.getElementById("edit-start-input-min");
    var startSec = document.getElementById("edit-start-input-sec");
    var endMin = document.getElementById("edit-end-input-min");
    var endSec = document.getElementById("edit-end-input-sec");
    containerToRemove.childNodes[1].innerHTML = titleInput.value;
    containerToRemove.childNodes[2].innerHTML = artistInput.value;
    chrome.extension.getBackgroundPage().editVideoByUid(titleInput.value, 
                                                         artistInput.value, 
                                                         videoIndexes[videoIndexToRemove], 
                                                         playlistInfo.viewingPlaylist,
                                                         parseInt(startMin.value),
                                                         parseInt(startSec.value),
                                                         parseInt(endMin.value),
                                                         parseInt(endSec.value));
    document.getElementById("edit-video-cancel-button").click();  
  }
  
  document.getElementById("edit-start-input-min").oninput = function(){
    if(document.getElementById("edit-start-input-min").value > document.getElementById("edit-start-input-min").max){
      document.getElementById("edit-start-input-min").value = document.getElementById("edit-start-input-min").max;
    }
  }
  
  document.getElementById("edit-start-input-sec").oninput = function(){
    if(document.getElementById("edit-start-input-sec").value > document.getElementById("edit-start-input-sec").max){
      document.getElementById("edit-start-input-sec").value = document.getElementById("edit-start-input-sec").max;
    }
  }
  
  document.getElementById("edit-end-input-min").oninput = function(){
    if(document.getElementById("edit-end-input-min").value > document.getElementById("edit-end-input-min").max){
      document.getElementById("edit-end-input-min").value = document.getElementById("edit-end-input-min").max;
    }
  }
  
  document.getElementById("edit-end-input-sec").oninput = function(){
    if(document.getElementById("edit-end-input-sec").value > document.getElementById("edit-end-input-sec").max){
      document.getElementById("edit-end-input-sec").value = document.getElementById("edit-end-input-sec").max;
    }
  }
  
  timeBar.onmousedown = function(){
    timeSliderDown = true;
  }
  
  timeBar.onmouseup = function(){
    timeSliderDown = false; 
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
      document.getElementById("control-time-bar-progress").style.width = "0%";
    }
  }
  
  timeBar.oninput = function(){
    var timeBarLength = 145 - ((1 - (this.value / this.max)) * 145) - (15 * (this.value / this.max)) + "px";
    
    document.getElementById("control-time-bar-progress").style.width = timeBarLength;
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
  var timeBarLength = 145 - ((1 - (curr / end)) * 145) - (15 * (curr / end)) + "px";
  
  currTime.innerHTML = currTimeStr;
  endTime.innerHTML = endTimeStr;
  document.getElementById("control-time-bar-progress").style.width = timeBarLength;
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
      timeBarLength = 145 - ((1 - (timeElapsed / end)) * 145) - (15 * (timeElapsed / end)) + "px";
      document.getElementById("control-time-bar-progress").style.width = timeBarLength;
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

/**
 * @param videos-The list of videos that this playlist should have. If undefined set to be []
 * @param name-The name of the playlist. If undefined, set to be "New Playlist"
 * @param image-The default image for the playlist. If undefined then use system set default
 */
function createNewPlaylist(videos, name, image){
  var usingDefaultImg = false;
  if(typeof videos == "undefined"){
    videos = [];
  }
  if(typeof name == "undefined"){
    name = "New Playlist";
  }
  if(typeof image == "undefined"){
    image = "images/default_playlist_img.png";
    usingDefaultImg = true;
  }
  // Create the actual playlist object and add it to the user's list of playlists
  function createAndAddPlaylist(videos, name, image, usingDefaultImg, callback){
    var uid = new Date().getTime().toString();
    var playlistObj = {
      name: name,
      image: image,
      usingDefaultImage: usingDefaultImg,
      videos: videos,
      uid: uid
    }
    chrome.extension.getBackgroundPage().addPlaylist(playlistObj);
    
    if(callback){
      callback(playlistObj);
    }
  }
  // Create the playlist display for the left column
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
  searchResultOptions.appendChild(addIcon);
  searchResultsContainer.appendChild(searchResultsImgContainer);
  searchResultsImgContainer.appendChild(searchResultsImg);
  searchResultsContainer.appendChild(searchResultsTitle);
  searchResultsContainer.appendChild(searchResultsArtist);
  searchResultsContainer.appendChild(searchResultOptions);
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

function displayPlaylistPopup(edit, uid){
  playlistPopup.style.display = "block"; 
  overlay.style.display = "block";
  playlistInputField.focus();
  if(edit){
    var playlist = chrome.extension.getBackgroundPage().getPlaylistByUid(uid); 
    if(typeof playlist != "undefined" && playlist.videos.length > 0 && playlist.image.slice(-31) == defaultPlaylistImage){
      document.getElementById("playlistSetImageImage").src = 
        chrome.extension.getBackgroundPage().getPlaylistImageByUid(uid, MQ_DEFAULT_IMG);
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
  var name = playlistInputField.value;
  var image = document.getElementById("playlistSetImageImage").src;
  var usingDefaultImage = (image.slice(-defaultPlaylistImage.length) == defaultPlaylistImage);
  //addPlaylistDiv(name, image, usingDefaultImage, undefined);
  if(usingDefaultImage){
    playlistGenerator.generateNewPlaylist(undefined, name, undefined, undefined);
  }
  else{
    playlistGenerator.generateNewPlaylist(undefined, name, image, undefined);
  }
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
      chrome.extension.getBackgroundPage().cleanVideoArrayByUid(playlistInfo.viewingPlaylist);
    }
  }
  else{

  }  
}

function startPlaylist(startingVideo, uid){
  var length = chrome.extension.getBackgroundPage().getPlaylistLengthByUid(uid);
  var shuffleOn = chrome.extension.getBackgroundPage().getInfo({id:"shuffleStatus"});
  if(startingVideo == -1 && shuffleOn){
    startingVideo = Math.floor(Math.random() * length); 
  }
  else if(startingVideo == -1 && !shuffleOn){
    startingVideo = 0;
  }
  
  chrome.extension.getBackgroundPage().initQueueByUid(startingVideo, uid);
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
  var length = chrome.extension.getBackgroundPage().getPlaylistLengthByUid(playlistInfo.viewingPlaylist);
  if(length == 1){
    if(!chrome.extension.getBackgroundPage().getPlaylistUsingDefaultImageByUid(playlistInfo.viewingPlaylist)){
      document.getElementById("player-image-image").src = defaultPlaylistImage;
    }
  }
  
  // Find the first available videoListPlayButton
  var firstAvailableIndex = -1;
  for(i = 0; i < videoListPlayButtons.length && firstAvailableIndex == -1; i++){
    if(videoListPlayButtons[i] != null){
      firstAvailableIndex = i;
    }
  }
  
  chrome.extension.getBackgroundPage().deleteVideoByUid(videoIndexToRemove, playlistInfo.viewingPlaylist);
  
  if(firstAvailableIndex != -1 && firstAvailableIndex == videoIndexToRemove){
    updatePlayistPageImage();
  }
  
  if(playlistInfo.playingPlaylist != playlistInfo.viewingPlaylist){
    videoListPlayButtons.splice(videoIndexToRemove, 1);
  }
  else{
    videoListPlayButtons[videoIndexToRemove] = null;
  }
  
  var playlistName = chrome.extension.getBackgroundPage().getPlaylistByUid(playlistInfo.viewingPlaylist).name;
  
  containerToRemove.parentNode.removeChild(containerToRemove);
  var videoDisplay = document.getElementById("Playlist " + playlistInfo.viewingPlaylist + ":" + playlistName).childNodes[1];
  var numVideos = chrome.extension.getBackgroundPage().getNumVideosByUid(playlistInfo.viewingPlaylist);
  videoDisplay.innerHTML = numVideos + " Videos";
  videoIndexToRemove = undefined;
  containerToRemove = undefined;
  
}

function editVideo(){
  overlay.style.display = "block";
  var video = chrome.extension.getBackgroundPage().getVideoByUid(playlistInfo.viewingPlaylist, videoIndexToRemove);
  var editVideoDiv = document.getElementById("edit-video-modal");
  editVideoDiv.style.display = "block";
  var titleInput = document.getElementById("edit-title-input");
  titleInput.value = video.videoTitle;
  var artistInput = document.getElementById("edit-artist-input");
  artistInput.value = video.channelTitle;
  var startTimeMin = document.getElementById("edit-start-input-min");
  var startTimeSec = document.getElementById("edit-start-input-sec");
  if(typeof video.startTime == "undefined"){
    startTimeMin.value = 0;
    startTimeSec.value = 0;
  }
  else{
    startTimeMin.value = Math.floor(video.startTime / 60);
    startTimeSec.value = video.startTime % 60;
  }
  var endTimeMin = document.getElementById("edit-end-input-min");
  var endTimeSec = document.getElementById("edit-end-input-sec");
  if(typeof video.endTime == "undefined"){
    var start = video.duration.indexOf("PT") + 2;
    var end = video.duration.indexOf("M");
    var min = parseInt(video.duration.slice(start, end));
    var sec = parseInt(video.duration.slice(end + 1, video.duration.indexOf("S")));
    endTimeMin.value = min;
    endTimeSec.value = sec;
    endTimeMin.max = min;
    startTimeMin.max = min;
  }
  else{
    endTimeMin.value = Math.floor(video.endTime / 60);
    endTimeSec.value = video.endTime % 60;
    endTimeMin.max = Math.floor(video.endTime / 60);
    startTimeMin.max = Math.floor(video.endTime / 60);
  }
  
  titleInput.focus();
}

/*function createPlaylistDiv(playlistObj){
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
    log(e);
    var start = "Playlist ".length;
    var playlistNum = 0;
    for(i = 0; i < e.path.length; i++){
      if(e.path[i].id.includes("Playlist")){
        var end = e.path[i].id.indexOf(":");
        playlistNum = parseInt(e.path[i].id.slice(start, end))
        i = e.path.length + 1;
      }
    }
    //displayPlaylistPopup(true, playlistNum);
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
}*/

function addPlaylistToPlaylistCollection(name, image, usingDefaultImage, videos){
  var uid = new Date().getTime().toString();
  
  var videoCollection = [];
  if(typeof videos != "undefined"){
    videoCollection = videos;
  }
  var playlistObj = {
    name: name,
    image: image,
    usingDefaultImage: usingDefaultImage,
    videos: videoCollection,
    uid: uid
  }
  chrome.extension.getBackgroundPage().addPlaylist(playlistObj);
  return playlistObj;
}

/*function addPlaylistDiv(name, image, usingDefaultImage, videos){
  //var uid = new Date().getTime().toString();
  createPlaylistDiv({containsPlaylist: false, name: name, image:image, videos: videos});
  /*var videoCollection = [];
  if(typeof videos != "undefined"){
    videoCollection = videos;
  }
  var playlistObj = {
    name: name,
    image: image,
    usingDefaultImage: usingDefaultImage,
    videos: videoCollection,
    uid: uid
  };
  chrome.extension.getBackgroundPage().addPlaylist(playlistObj);
  addPlaylistToPlaylistCollection(name, image, usingDefaultImage, videos);
}*/

function displayPlaylists(){
  var numPlaylists = chrome.extension.getBackgroundPage().getInfo({id:"playlistCount"});
  var playlistCollection = chrome.extension.getBackgroundPage().getInfo({id:"playlistCollection"});
  
  for(i = 0; i < numPlaylists; i++){
    var obj = {
      name: playlistCollection[i].name,
      image: playlistCollection[i].image,
      usingDefaultImage: playlistCollection[i].usingDefaultImage,  
      videos: playlistCollection[i].videos,
      uid: playlistCollection[i].uid
    };
    playlistGenerator.displayPlaylist(obj, undefined);
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
      loadPlaylistPageByUid(playlistInfo.playingPlaylist);
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
  importOtherUrlInput = document.getElementById("import-other-url-input");
  
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

/*function loadPlaylistPage(playlistNumber){
  
  if(window.getComputedStyle(document.getElementById("video-bar")).display == "none"){
    document.getElementById("video-bar").style.display = "block";
  }
  
  // Get info about the current video being played from the background page
  var playlistLength = chrome.extension.getBackgroundPage().getQueueLength();
  var backgroundPlayerState = chrome.extension.getBackgroundPage().getInfo({id: "playerState"});
  
  var playlist = chrome.extension.getBackgroundPage().getInfo({id:"playlist", playlistNumber: playlistNumber});
  currPlaylistLoaded = playlist;
  
  if(typeof playlist != "undefined"){
    chrome.extension.getBackgroundPage().setViewingPlaylist(playlistNumber);
    var videos = playlist.videos;
    var state = playlistLength > 0 && (backgroundPlayerState >= 0 && backgroundPlayerState < 5);
    
    // Check to see if there is a video playing/loaded in the background
    if(state){
      if(window.getComputedStyle(document.getElementById("player")).display != "block"){
        document.getElementById("player").style.display = "block";
        document.getElementById("playerImage").style.display = "none";
        if(backgroundPlayerState == YT.PlayerState.PLAYING &&
           pagePlayer.getPlayerState() != YT.PlayerState.PLAYING){
          // If there is a video playing in the background and there is no video being played in the
          // foreground then seek to the same position in the page player and play the video
          pagePlayerStatus = "pagePlayerSeeking";
          pagePlayer.seekTo(chrome.extension.getBackgroundPage().getCurrentTime() + 5);    
        }
        else if(backgroundPlayerState == YT.PlayerState.PLAYING &&
                pagePlayer.getPlayerState() == YT.PlayerState.PLAYING){

        }
        else if(backgroundPlayerState == YT.PlayerState.PAUSED && 
                pagePlayer.getPlayerState() == YT.PlayerState.PAUSED){

        }
        else/*(backgroundPlayerState >= 0 && backgroundPlayerState < 5){
          // If there is a video loaded but not playing in the background and there is no video 
          // loaded in the foreground then seek to the same position in the foreground
          pagePlayerStatus = "seeking";
          pagePlayer.seekTo(chrome.extension.getBackgroundPage().getCurrentTime());
        }
        setPlayingPlaylist();
      }
    }
    else{
      // If there is no video being played then display the image for the playlist
      var img = document.getElementById("player-image-image");
      img.src = chrome.extension.getBackgroundPage().getPlaylistImage(playlistNumber, SD_DEFAULT_IMG);
      document.getElementById("player").style.display = "none";
      document.getElementById("playerImage").style.display = "block";
    }
    displayPlaylistVideoThumbnails(playlist);
  }
  else{
    chrome.extension.getBackgroundPage().setViewingPlaylist(undefined);
  }
}*/

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
  var playlistCollection = chrome.extension.getBackgroundPage().getUnfilteredPlaylistCollection();
  var div = document.getElementById("playlist-selection-container");
  var firstDiv = document.createElement("div");
  firstDiv.classList.add("playlist-selection-container-div", "button");
  firstDiv.style.textAlign = "center";
  firstDiv.innerHTML = "Create New Playlist";
  div.appendChild(firstDiv);
  firstDiv.onclick = function(){
    var name = "New Playlist";
    chrome.extension.getBackgroundPage().createVideo(currSearchResultId, function(video){
      var videos = [video];
      playlistGenerator.generateNewPlaylist(videos, name, undefined, undefined);
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

function updateControlPanel(video){
  
  if(!controlLoaded){
    setupControlPanel();
  }

}

function updatePlayistPageImage(){
  document.getElementById("player-image-image").src = 
    chrome.extension.getBackgroundPage().getPlaylistImageByUid(playlistInfo.viewingPlaylist, SD_DEFAULT_IMG);
}

function play(video){
  if(video.videoId != currVideoId){
    pagePlayerStatus = "waitingForSync";
    if(typeof video.startTime == "undefined" || typeof video.endTime == "undefined"){
      pagePlayer.loadVideoById(video.videoId, 0, quality);
    }
    else{
      pagePlayer.loadVideoById({"videoId": video.videoId,
                                "startSeconds": video.startTime,
                                "endSeconds": video.endTime,
                                "suggestedQuality": quality});
    }
    chrome.extension.getBackgroundPage().loadVideo(video);
    currVideoId = video.videoId;
  }
  else{
    var video = chrome.extension.getBackgroundPage().getCurrVideo();
    if(typeof video != "undefined" && typeof video.startTime != "undefined"){
      pagePlayer.seekTo(video.startTime);
      chrome.extension.getBackgroundPage().seekTo(video.startTime);
    }
    else{
      pagePlayer.seekTo(0);
      chrome.extension.getBackgroundPage().seekTo(0);
    }
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
    if(//window.getComputedStyle(document.getElementById("search-container")).display == "none" ||
       message.uid == playlistInfo.viewingPlaylist){
      log("creating video div with " + message.videoIndex);
      createVideoDiv(message.video, message.videoIndex);
    }
    
    if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist){
      chrome.extension.getBackgroundPage().addToQueue(message.video, videoListPlayButtons.length - 1);
    }
    if(playlistInfo.viewingPlaylist != -1 &&      chrome.extension.getBackgroundPage().getPlaylistLengthByUid(playlistInfo.viewingPlaylist) == 1){
      document.getElementById("player-image-image").src = 
        chrome.extension.getBackgroundPage().getPlaylistImageByUid(playlistInfo.viewingPlaylist, SD_DEFAULT_IMG);
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
    if(playlistInfo.playingPlaylist == playlistInfo.viewingPlaylist && typeof message.videoIndex != "undefined"){
      updateVideoListPlayButtons(message.videoIndex, undefined);
    }
    updateControlPanelPlayButton(false);
  }
});

function setPlayingPlaylist(){
  playlistInfo.playingPlaylist = playlistInfo.viewingPlaylist;
  chrome.extension.getBackgroundPage().setPlayingPlaylist(playlistInfo.playingPlaylist);
}

window.addEventListener("load", onload, false);