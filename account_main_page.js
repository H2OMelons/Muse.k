var port = chrome.runtime.connect();

const DEFAULT_IMG = -1;
const MQ_DEFAULT_IMG = 0;
const SD_DEFAULT_IMG = 1;
const KEYCODE_ENTER = 13;

var defaultPlaylistImage = "images/default_playlist_img.png";
var i;

var currPlaylistId;
var editPlaylistId;

var playlistContainer;        // Container that contains all divs pertaining to playlists
var playlistPopup;            // Popup that asks user for a playlist name during creation
var addPlaylistButton;        // Button that user clicks to bring up the popup
var createPlaylistButton;     // Button that actually creates the playlist in the popup
var cancelCreateButton;       // Button that cancels playlist creation in the popup
var playlistInputField;       // Input field that the user enters the playlist name in the popup

var infoBarButton;            // The button to the top left that toggles the playlist list into/out of view

var videoList;                // The container that holds a playlist's videos
var playlistList;             // The container that holds all playlists

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

var playlistSelectionContainerList = [];

var playlistCollectionManager; // Object gotten from background page to control playlists
var videoPlayerManager;

var currSelection = 1;

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
  var uidGenerator = 0;
  // If any of the given parameters are undefined then set them to be the default values
  if(typeof videos == "undefined"){
    videos = [];     
  }
  else{
    var i;
    for(i = 0; i < videos.length; i++){
      videos[i].uid = uidGenerator;
      uidGenerator++;
    }
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
    uid: uid,
    videoUidGenerator: uidGenerator
  }
  
  playlistCollectionManager.insertPlaylist(playlistObj);
  
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
  var index = playlistCollectionManager.size();
  
  var div = document.createElement("div");
  var tag = "Playlist " + playlistObj.uid + ":" + name;
  div.id = tag;
  div.classList.add("playlist-container");
  
  var titleContainer = document.createElement("input");
  titleContainer.type = "text";
  titleContainer.maxlength = "50";
  titleContainer.classList.add("ellipsis", "playlist-title", "small-font", "border-none", "white");
  titleContainer.value = playlistObj.name;
  titleContainer.disabled = "disabled";
  
  
  
  var infoContainer = document.createElement("text");
  infoContainer.classList.add("ellipsis", "playlist-length", "tiny-font", "gray");
  
  var numVideos = playlistObj.videos.length;
  
  var j = 0;
  for(j = 0; j < playlistObj.videos.length; j++){
    if(playlistObj.videos[j] == -1){
      numVideos--;
    }
  }
  
  if(numVideos == 1){
    infoContainer.innerHTML = numVideos + " Video";
  }
  else{
    infoContainer.innerHTML = numVideos + " Videos";
  }
    
  div.onclick = function(e){
    if(e.path[0].tag != "i"){
      if(playlistObj.uid != playlistCollectionManager.getViewingPlaylistUid()){
        if(typeof playlistPageManager.viewingVideoListManager != "undefined"){
          var buttonsMap = playlistPageManager.getVideoListManager().playButtons;
          buttonsMap.forEach(function(value, key){
            if(value != null){
              value.parentNode.parentNode.removeChild(value.parentNode);
            }
          });
        }
        playlistCollectionManager.setViewingPlaylistUid(playlistObj.uid);
        playlistPageManager.loadPlaylistPage(playlistObj.uid);
      }
    }
    else{
      //var playlist = playlistCollectionManager.getPlaylist(playlistObj.uid);
      //playlistCollectionManager.setEditingPlaylistUid(playlistObj.uid);
      //currPlaylistLoaded = playlist;
    }
  }
  
  var settings = document.createElement("div");
  settings.classList.add("playlist-settings");
  var deleteContainer = document.createElement("div");
  deleteContainer.classList.add("playlist-delete", "float-left", "button");
  var deleteButtonImg = document.createElement("div");
  deleteButtonImg.tag = "i";
  deleteButtonImg.classList.add("fa", "fa-trash-o", "fa-lg");
  deleteButtonImg.setAttribute("aria-hidden", "true");
  deleteContainer.appendChild(deleteButtonImg);
  
  deleteContainer.onclick = function(){
    playlistCollectionManager.setEditingPlaylistUid(playlistObj.uid);
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
  editContainer.classList.add("playlist-edit", "float-left", "button", "fa-lg");
  var editButtonImg = document.createElement("div");
  editButtonImg.tag = "i";
  editButtonImg.classList.add("fa", "fa-pencil-square-o");
  editButtonImg.setAttribute("aria-hidden", "true");
  editContainer.appendChild(editButtonImg);
  settings.appendChild(editContainer);
  settings.appendChild(deleteContainer);
  
  editContainer.onclick = function(e){
    if(titleContainer.disabled == ""){
      var playlist = playlistCollectionManager.getPlaylist(playlistObj.uid);
      if(titleContainer.value != playlist.name){
        playlist.name = titleContainer.value;
        playlistCollectionManager.editPlaylist(playlist);
        if(playlistCollectionManager.getViewingPlaylistUid() == playlistObj.uid){
          document.getElementById("playlist-name").innerHTML = titleContainer.value;
        }
      }
      titleContainer.disabled = "disabled";
    }
    else{
      titleContainer.disabled = "";
      titleContainer.focus();
    }
  }
  
  titleContainer.onkeyup = function(e){
    if(e.keyCode == KEYCODE_ENTER){
      editContainer.click();
    }
  }
  
  div.onmouseleave = function(){
    if(titleContainer.disabled == ""){
      titleContainer.disabled = "disabled";
    }
  }
  
  div.appendChild(titleContainer);
  div.appendChild(infoContainer);
  div.appendChild(settings);
  document.getElementById("playlist-list").appendChild(div);
  
  if(callback){
    callback();
  }
}

var playlistGenerator = new PlaylistGenerator();

/*----------------------------------------------------------------
 * PlaylistPageManager object that controls how the playlists
 * are loaded and displayed
 *----------------------------------------------------------------
 */

function PlaylistPageManager(){
  this.viewingVideoListManager = undefined;
  this.currPlaylist = undefined;
  this.videoBarDisplayed = false;
  this.videoStatus = this.VIDEO_NOT_LOADED;
}

PlaylistPageManager.prototype.VIDEO_NOT_LOADED = 0;
PlaylistPageManager.prototype.VIDEO_LOADED = 1;

PlaylistPageManager.prototype.loadPlaylistPage = function(uid){
  videoPlayerManager.setPlaylistManager(playlistCollectionManager.getViewingManager());
  
  // Get info about the current video being played from the background page
  var playlistLength = chrome.extension.getBackgroundPage().getQueueLength();
  
  var playlist = playlistCollectionManager.getViewingPlaylist();
  this.currPlaylist = playlist;
  
  document.getElementById("playlist-name").innerHTML = playlist.name;
  
  this.viewingVideoListManager = new VideoListManager(playlist);
  
  if(typeof playlist != "undefined"){
    this.viewingVideoListManager.displayVideos();
  }
  else{
    playlistCollectionManager.setViewingPlaylistUid(undefined);
  }
}

PlaylistPageManager.prototype.getVideoListManager = function(){
  return this.viewingVideoListManager;
}

var playlistPageManager = new PlaylistPageManager();

/*----------------------------------------------------------------
 * VideoListManager is an object that manages the video list
 * that appears when the user loads a playlist page
 *----------------------------------------------------------------
 */

function VideoListManager(playlist){
  this.playlist = playlist;
  this.videoBeingPlayed = undefined;
  this.playButtons = new Map();
  this.videoIndexes = [];
  this.videoToBeRemoved = undefined;
  this.videoToBeEdited = undefined;
}

VideoListManager.prototype.displayVideos = function(){
  var videos = this.playlist.videos;
  var numDeletedVideos = 0;
  var videosUpdated = false;
  if(videos.length > 0){
    for(i = 0; i < videos.length; i++){
      if(videos[i] != -1){
        this.videoIndexes.push(i - numDeletedVideos);
        this.createVideoDiv(videos[i], i - numDeletedVideos);
      }
      else{
        numDeletedVideos++;
      }
    }
    if(numDeletedVideos > 0){
      chrome.extension.getBackgroundPage().cleanVideoArrayByUid(this.playlist.uid);
    }
  }
}

VideoListManager.prototype.createVideoDiv = function(video, index){
  var container = document.createElement("div");
  container.classList.add("video-container", "card-background");
  container.id = index;
  
  var playButton = document.createElement("div");
  playButton.classList.add("video-img", "video-play-pause-button");

  var playContainer = document.createElement("div");
  playContainer.classList.add("video-play-button");
  var play = document.createElement("i");
  play.classList.add("fa", "fa-play", "fa-lg");
  play.setAttribute("aria-hidden", "true");
  playContainer.appendChild(play);
  
  var pauseContainer = document.createElement("div");
  pauseContainer.classList.add("video-pause-button");
  var pause = document.createElement("i");
  pause.classList.add("fa", "fa-pause", "fa-lg");
  pause.setAttribute("aria-hidden", "true");
  pauseContainer.appendChild(pause);
  
  playButton.appendChild(playContainer);
  playButton.appendChild(pauseContainer);
  
  var manager = this;
  
  if((playlistCollectionManager.getPlayingPlaylistUid() == playlistCollectionManager.getViewingPlaylistUid())){
    var videoBeingPlayedUid = videoPlayerManager.getVideoBeingPlayed().uid;
    if((video.uid == videoBeingPlayedUid) &&
       (videoPlayerManager.getBackgroundVideoPlayer().getPlayerState() == videoPlayerManager.PLAYING)){
      videoPlayerManager.setPlayButtons(manager.playButtons);
      playContainer.style.display = "none";
      pauseContainer.style.display = "block";
    }
    else{
      playContainer.style.display = "block";
      pauseContainer.style.display = "none";
    }
    this.videoBeingPlayed = playButton;
  }
  else{
    playContainer.style.display = "block";
    pauseContainer.style.display = "none";
  }
  
  
  
  playContainer.onclick = function(){
    if(playlistCollectionManager.getPlayingPlaylistUid() == playlistCollectionManager.getViewingPlaylistUid()){
      manager.playButtons.forEach(function(value, key){
        if(value.childNodes[0].style.display != "block"){
          value.childNodes[0].style.display = "block";
          value.childNodes[1].style.display = "none";
        }
      });
    }
    setPlayingPlaylist();
    videoPlayerManager.setPlayButtons(manager.playButtons);
    if(typeof manager.videoBeingPlayed != "undefined" &&
       manager.videoBeingPlayed != null){
      // If another video is currently playing then change the button status
      manager.videoBeingPlayed.childNodes[0].style.display = "block";
      manager.videoBeingPlayed.childNodes[1].style.display = "none";
    }
    if(manager.videoBeingPlayed == this.parentNode &&
       videoPlayerManager.getBackgroundVideoPlayer().getPlayerState() == videoPlayerManager.PAUSED){
      videoPlayerManager.playVideo();
    }
    else{
      startPlaylist(video);
      manager.videoBeingPlayed = playButton;
    }
    updateControlPanelPlayButton(true);
    playContainer.style.display = "none";
    pauseContainer.style.display = "block";
  };
  
  pauseContainer.onclick = function(){
    videoPlayerManager.pauseVideo();
    updateControlPanelPlayButton(false);
    playContainer.style.display = "block";
    pauseContainer.style.display = "none";
  }
  
  this.playButtons.set(video.uid, playButton);
  
  var title = document.createElement("text");
  title.classList.add("tiny-font", "left-column-video-title", "ellipsis");
  title.innerHTML = video.videoTitle;

  var duration = document.createElement("div");
  duration.classList.add("tiny-font", "left-column-duration", "gray");
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
  
  var deleteContainer = document.createElement("div");
  deleteContainer.classList.add("video-delete", "button");
  var deleteVideo = document.createElement("i");
  deleteVideo.classList.add("fa", "fa-trash-o");
  deleteVideo.setAttribute("aria-hidden", "true");
  deleteContainer.appendChild(deleteVideo);
  settings.appendChild(deleteContainer);
  
  deleteContainer.onclick = function(){
    var length = playlistCollectionManager.getPlaylistLength(playlistCollectionManager.getViewingPlaylistUid());

    playlistCollectionManager.deleteVideo(video.uid);
    container.parentNode.removeChild(container);

    var playlistName = playlistCollectionManager.getViewingPlaylist().name;
    
    var viewingPlaylist = playlistCollectionManager.getViewingPlaylistUid();
    var videoDisplay = document.getElementById("Playlist " + viewingPlaylist + ":" + playlistName).childNodes[1];
    var numVideos = chrome.extension.getBackgroundPage().getNumVideosByUid(viewingPlaylist);
    videoDisplay.innerHTML = numVideos + " Videos";
  }
  
  var editContainer = document.createElement("div");
  editContainer.classList.add("video-edit", "button");
  var edit = document.createElement("i");
  edit.classList.add("fa", "fa-pencil-square-o");
  edit.setAttribute("aria-hidden", "true");
  editContainer.appendChild(edit);
  settings.appendChild(editContainer);
  
  editContainer.onclick = function(){
    overlay.style.display = "block";
    
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
  
  var videoOverlay = document.createElement("div");
  videoOverlay.classList.add("video-img", "video-img-overlay");
  
  var videoImg = document.createElement("img");
  videoImg.classList.add("video-img");
  videoImg.src = "http://img.youtube.com/vi/" + video.videoId + "/1.jpg";
  
  container.appendChild(playButton);
  container.appendChild(videoOverlay);
  container.appendChild(videoImg);
  container.appendChild(title);
  container.appendChild(duration);
  container.appendChild(settings);

  videoList.appendChild(container);
}

VideoListManager.prototype.updatePlayButton = function(uid, play){
  if(play){
    this.playButtons.get(uid).childNodes[0].style.display = "none";
    this.playButtons.get(uid).childNodes[1].style.display = "block";
  }
  else{
    this.playButtons.get(uid).childNodes[0].style.display = "block";
    this.playButtons.get(uid).childNodes[1].style.display = "none";
  }
}

VideoListManager.prototype.getVideoToBeRemoved = function(){
  return this.videoToBeRemoved;
}

VideoListManager.prototype.setVideoToBeRemoved = function(video){
  this.videoToBeRemoved = video;
}

VideoListManager.prototype.getVideoToBeEdited = function(){
  return this.videoToBeEdited;
}

VideoListManager.prototype.setVideoToBeEdited = function(video){
  this.videoToBeEdited = video;
}

// Array to keep track of the indexes of the videos for when users want to delete videos from playlists
var videoIndexes = []; 

/*---------------------------------------------------------------
 * PlaylistModalManager object controls the functions of the 
 * playlist modal that the user uses to edit/create/import
 * playlists
 *---------------------------------------------------------------
 */

function PlaylistModalManager(){
  
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
    }
  });
}


function onModalPlayerStateChange(event) {
  
  if(event.data == videoPlayerManager.PLAYING){
    if(videoPlayerManager.getBackgroundVideoPlayer().getPlayerState() == videoPlayerManager.PLAYING ||
       videoPlayerManager.getBackgroundVideoPlayer().getPlayerState() == videoPlayerManager.BUFFERING){
      videoPlayerManager.pauseVideo();
      pausedByModal = true;
    }
  }
  else if(event.data == videoPlayerManager.PAUSED){
    if(pausedByModal){
      videoPlayerManager.playVideo();
      pausedByModal = false;
    }
  }
  else if(event.data == videoPlayerManager.CUED){
    pausedByModal = false;
  }
  else if(event.data == -1){
    if(pausedByModal){
      pagePlayer.playVideo();   
    }
  }
}

function loadVideoPreview(videoId){
  modalPlayer.cueVideoById(videoId, 0, quality);
  document.getElementById("videoModalResultDisplay").style.display = "block";
}

function onModalPlayerReady(event){
  
}

function initListeners(){
  // Opens a window for the user to add a playlist and closes the window 
  // if clicked again
//  addPlaylistButton.onclick = function(){
//    displayPlaylistPopup(false, undefined);
//  };
//  addVideoButton.onclick = function(){
//    if(window.getComputedStyle(addVideoModal).display == "none"){
//      addVideoModal.style.display = "block";
//      overlay.style.display = "block";
//      videoUrlInput.focus();
//    }
//    else{
//      addVideoModal.style.display = "none";
//      overlay.style.display = "none";
//    }
//  };
//  addVideoConfirmButton.onclick = function(){
//    var enteredUrl = videoUrlInput.value;
//    var key = "watch?v=";
//    var start = enteredUrl.indexOf(key);
//    if(start != -1){
//      start += key.length;
//      var end = start + 11;
//      var videoId = enteredUrl.slice(start, end);
//      var uid = playlistCollectionManager.getViewingPlaylistUid();
//      playlistCollectionManager.insertVideo(uid, videoId);
//      var id = "Playlist " + uid + ":" + playlistCollectionManager.getPlaylist(uid).name;
//      var videoDisplay = document.getElementById(id).childNodes[1];
//      var numVideos = parseInt(videoDisplay.innerHTML.substr(0, videoDisplay.innerHTML.indexOf("V") - 1)) + 1;
//      videoDisplay.innerHTML = numVideos + " Videos";
//    }
//    addVideoCancelButton.click();
//  };
//  addVideoCancelButton.onclick = function(){
//    addVideoModal.style.display = "none";
//    videoUrlInput.value = "";
//    modalPlayer.stopVideo();
//    document.getElementById("videoModalResultDisplay").style.display = "none";
//    overlay.style.display = "none";
//  };
//  videoUrlInput.onkeyup = function(){
//    var enteredUrl = videoUrlInput.value;
//    var key = "watch?v=";
//    var start = enteredUrl.indexOf(key);
//    if(start != -1){
//      start += key.length;
//      var end = start + 11;
//      var videoId = enteredUrl.slice(start, end);
//      if(videoId.length == 11){
//        loadVideoPreview(videoId);
//      }
//    }
//  };
//  playlistInputField.onkeyup = function(){
//    var numChars = playlistInputField.value.length;
//    document.getElementById("playlistTextboxCharCount").innerHTML = numChars + "/50";
//  };
//  setImageButton.addEventListener("change", function(){
//    var file = setImageButton.files[0];
//    var reader = new FileReader();
//    reader.onloadend = function(){
//      document.getElementById("playlistSetImageImage").src = reader.result;  
//    }
//    if(file){
//      reader.readAsDataURL(file);
//    }
//    else{
//      document.getElementById("playlistSetImageImage").src = defaultPlaylistImage;
//    }
//  }, true);
//
  deletePlaylistPopup.addEventListener("cancel", function(){
    deletePlaylistPopupCancelButton.click();
  });
  deletePlaylistPopupCancelButton.onclick = function(){
    overlay.style.display = "none";
    deletePlaylistPopup.style.display = "none";
  };
  
  deletePlaylistPopupConfirmButton.onclick = function(event){
    var playlist = playlistCollectionManager.getEditingPlaylist();
    // Delete the playlist from storage
    playlistCollectionManager.deletePlaylist();
    // Remove the playlist div from the left hand column
    var editId = "Playlist " + playlist.uid + ":" + playlist.name;
    document.getElementById(editId).parentNode.removeChild(document.getElementById(editId));
    // If the playlist being deleted is the same as the one that is currently playing, reset the playing
    // details
    if(playlistCollectionManager.getEditingPlaylistUid() == playlistCollectionManager.getPlayingPlaylistUid()){
      videoBeingPlayed = undefined;
      currVideoId = undefined;
      playlistCollectionManager.setPlayingPlaylistUid(undefined);
    }
    // If the playlist being deleted is the same as the one being displayed, then close the page
    if(playlistCollectionManager.getEditingPlaylistUid() == playlistCollectionManager.getViewingPlaylistUid()){
      //document.getElementById("playerImage").style.display = "none";
      //document.getElementById("video-bar").style.display = "none";
      //playlistPageManager.videoBarDisplayed = false;
      if(typeof playlistPageManager.viewingVideoListManager != "undefined"){
        var buttonsMap = playlistPageManager.viewingVideoListManager.playButtons;
        buttonsMap.forEach(function(value, key){
          value.parentNode.parentNode.removeChild(value.parentNode);  
        });
        playlistPageManager.viewingVideoListManager = undefined;
      }
      document.getElementById("playlist-name").innerHTML = "";
    }
    // Reset UI to normal
    playlistCollectionManager.setEditingPlaylistUid(undefined);
    editPlaylistId = undefined;
    deletePlaylistPopup.style.display = "none";
    overlay.style.display = "none";
    //var playlistSelectionContainer = document.getElementById("playlist-selection-container");
    //for(i = 0; i < playlistSelectionContainerList.length; i++){
    //  playlistSelectionContainerList[i].parentNode.removeChild(playlistSelectionContainerList[i]);
    //}
    //playlistSelectionContainerList = [];
    //setupPlaylistSelectionContainer();
  }
//  
//  // Clicks the create playlist button when user hits enter key
//  searchInput.onkeyup = function(){
//    if(event.keyCode == KEYCODE_ENTER){
//      searchButton.click();
//    }
//  };
//  
//  importDefaultContainer.onkeypress = function(){
//    if(event.keyCode == KEYCODE_ENTER){
//      createPlaylistButton.click();
//    }
//  };
//  
//  searchButton.onclick = function(){
//    var keywords = searchInput.value;
//    if(keywords.length != 0 && keywords.replace(/\s/g, '').length != 0){
//      keywords = keywords.replace(/\s/g, '');
//      
//      var displayContainer = document.getElementById("search-results-display");
//      
//      while(displayContainer.firstChild){
//        displayContainer.removeChild(displayContainer.firstChild);
//      }
//      
//      chrome.extension.getBackgroundPage().search(keywords, function(item){
//        for(i = 0; i < item.items.length; i++){
//          createSearchResultDiv(item.items[i]);
//        }
//      });
//    }
//  };
//
//  controlPlayButton.onclick = function(){
//    if(videoPlayerManager.getBackgroundVideoPlayer().getPlayerState() == videoPlayerManager.PAUSED){
//      updateControlPanelPlayButton(true);
//      videoPlayerManager.playVideo();
//    }
//  }
//  controlPauseButton.onclick = function(){
//    if(videoPlayerManager.getBackgroundVideoPlayer().getPlayerState() == videoPlayerManager.PLAYING ||
//       videoPlayerManager.getBackgroundVideoPlayer().getPlayerState() == videoPlayerManager.BUFFERING){
//      updateControlPanelPlayButton(false);
//      videoPlayerManager.pauseVideo();
//    }
//  }
//  controlFastForwardButton.onclick = function(){
//    videoPlayerManager.fastForward();
//  }
//  controlRewindButton.onclick = function(){
//    videoPlayerManager.rewind();
//  }
//  
//  controlRepeatButton.onclick = function(){
//    var repeatOn = chrome.extension.getBackgroundPage().getInfo({id:"repeatStatus"});
//    if(repeatOn){
//      controlRepeatButton.style.color = "black";
//    }
//    else{
//      controlRepeatButton.style.color = "green"
//    }
//    chrome.extension.getBackgroundPage().setRepeat(!repeatOn);
//  }
//  controlShuffleButton.onclick = function(){
//    var shuffleOn = chrome.extension.getBackgroundPage().getInfo({id:"shuffleStatus"});
//    if(shuffleOn){
//      controlShuffleButton.style.color = "black";
//    }
//    else{
//      controlShuffleButton.style.color = "green";
//    }
//    chrome.extension.getBackgroundPage().setShuffle(!shuffleOn);
//  }
//  
//  document.getElementById("settings-button").onclick = function(){
//    if(window.getComputedStyle(document.getElementById("settings-container")).display == "none"){
//      document.getElementById("settings-container").style.display = "block";
//      document.getElementById("transparent-overlay").style.display = "block";
//      if(quality == "small"){
//        document.getElementById("smallQualitySelection").style.backgroundColor = "green";
//      }
//      else if(quality == "medium"){
//        document.getElementById("mediumQualitySelection").style.backgroundColor = "green";
//      }
//      else if(quality == "large"){
//        document.getElementById("largeQualitySelection").style.backgroundColor = "green";
//      }
//      else if(quality == "hd720"){
//        document.getElementById("hd720QualitySelection").style.backgroundColor = "green";
//      }
//      else{
//        document.getElementById("defaultQualitySelection").style.backgroundColor = "green";
//      }
//    }
//    else{
//      document.getElementById("settings-container").style.display = "none"; 
//      document.getElementById("transparent-overlay").style.display = "none";
//    }
//  }
//  
//  
//  
//  document.getElementById("playlist-tab").onclick = function(){
//    if(window.getComputedStyle(document.getElementById("playlist-container")).display == "none"){
//      document.getElementById("playlist-container").style.display = "block";
//      document.getElementById("playlist-tab").style.borderBottom = "none";
//      document.getElementById("search-container").style.display = "none";
//      document.getElementById("search-tab").style.borderBottom = "1px solid lightgray";
//    }
//  }
//  
//  document.getElementById("search-tab").onclick = function(){
//    if(window.getComputedStyle(document.getElementById("search-container")).display == "none"){
//      document.getElementById("playlist-container").style.display = "none";
//      document.getElementById("playlist-tab").style.borderBottom = "1px solid lightgray";
//      document.getElementById("search-container").style.display = "block";
//      document.getElementById("search-tab").style.borderBottom = "none";
//    }
//  }
//  
//  volumeBar.onclick = function(e){
//    var volume = e.offsetX;
//
//    document.getElementById("volume-bar-fill").style.width = volume + "px";
//    // Convert volume to be in range 0-100
//    volume = Math.round((volume / 50) * 100);
//    chrome.extension.getBackgroundPage().setVolume({"volume": volume, "mute": false});
//  }
//  
//  document.getElementById("volume-on").onclick = function(){
//    document.getElementById("volume-on").style.display = "none";
//    document.getElementById("volume-off").style.display = "block";
//    document.getElementById("volume-bar-fill").style.width = "0px";
//    var volume = chrome.extension.getBackgroundPage().getVolume().volume;
//    chrome.extension.getBackgroundPage().setVolume({"volume": volume, "mute": true});
//  }
//  
//  document.getElementById("volume-off").onclick = function(){
//    document.getElementById("volume-on").style.display = "block";
//    document.getElementById("volume-off").style.display = "none";
//    var volume = chrome.extension.getBackgroundPage().getVolume().volume;
//    chrome.extension.getBackgroundPage().setVolume({"volume": volume, "mute": false});
//    document.getElementById("volume-bar-fill").style.width = (volume / 2) + "px";
//  }
//  
//  document.getElementById("smallQualitySelection").onclick = function(){
//    if(document.getElementById("smallQualitySelection").style.backgroundColor != "green"){
//      document.getElementById(quality+"QualitySelection").style.backgroundColor = "white";
//      document.getElementById("smallQualitySelection").style.backgroundColor = "green";
//      quality = "small";
//      chrome.extension.getBackgroundPage().setQuality("small");
//    }
//  }
//  document.getElementById("mediumQualitySelection").onclick = function(){
//    if(document.getElementById("mediumQualitySelection").style.backgroundColor != "green"){
//      document.getElementById(quality+"QualitySelection").style.backgroundColor = "white";
//      document.getElementById("mediumQualitySelection").style.backgroundColor = "green";
//      quality = "medium";
//      chrome.extension.getBackgroundPage().setQuality("medium");
//    }
//  }
//  document.getElementById("largeQualitySelection").onclick = function(){
//    if(document.getElementById("largeQualitySelection").style.backgroundColor != "green"){
//      document.getElementById(quality+"QualitySelection").style.backgroundColor = "white";
//      document.getElementById("largeQualitySelection").style.backgroundColor = "green";
//      quality = "large";
//      chrome.extension.getBackgroundPage().setQuality("large");
//    }
//  }
//  document.getElementById("hd720QualitySelection").onclick = function(){
//    if(document.getElementById("hd720QualitySelection").style.backgroundColor != "green"){
//      document.getElementById(quality+"QualitySelection").style.backgroundColor = "white";
//      document.getElementById("hd720QualitySelection").style.backgroundColor = "green";
//      quality = "hd720";
//      chrome.extension.getBackgroundPage().setQuality("hd720");
//    }
//  }
//  document.getElementById("defaultQualitySelection").onclick = function(){
//    if(document.getElementById("defaultQualitySelection").style.backgroundColor != "green"){
//      document.getElementById(quality+"QualitySelection").style.backgroundColor = "white";
//      document.getElementById("defaultQualitySelection").style.backgroundColor = "green";
//      quality = "default";
//      chrome.extension.getBackgroundPage().setQuality("default");
//    }
//  }
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
  
  var logout = false;
  
  importUser.onclick = function(){
    if(currSelection != 2){
      currSelection = 2;
      importUser.style.borderBottom = "1px solid lightgray";
      importUserContainer.style.display = "block";
      importOther.style.borderBottom = "0";
      importOtherContainer.style.display = "none";
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
    document.getElementById("url-selection-url-input").focus();
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
          document.getElementById("display-all-selection-results-buttons").style.display = "none";
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
    document.getElementById("display-all-selection-results-buttons").style.display = "block";
    document.getElementById("url-selection-url-input").value = "";
    document.getElementById("url-selection-url-input").focus();
    for(i = 0; i < userImportChoices.length; i++){
      userImportChoices[i] = false;
    }
  }
  
  document.getElementById("display-all-selection-cancel-button").onclick = function(){
    playlistPopup.dispatchEvent(cancelEvent);
  };
  
  importOther.onclick = function(){
    if(currSelection != 1){
      currSelection = 1;
      importUser.style.borderBottom = "0";
      importUserContainer.style.display = "none";
      importOther.style.borderBottom = "1px solid lightgray";
      importOtherContainer.style.display = "block";
      document.getElementById("import-other-url-input").focus();
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
    importOther.style.borderBottom = "1px solid lightgray";
    importUser.style.borderBottom = "0";
    document.getElementById("url-selection-url-input").value = "";
    document.getElementById("url-selection-results-container").style.display = "none";
    document.getElementById("url-selection-results-button").style.display = "none";
    document.getElementById("url-selection-results-cancel-button").style.display = "none";
    importOtherContainer.style.display = "block";
    importUserContainer.style.display = "none";
    
    document.getElementById("import-other-url-input").style.display = "block";
    document.getElementById("import-other-url-input").value = "";
    document.getElementById("import-other-load").style.display = "none";
    document.getElementById("import-other-success").style.display = "none";
    currSelection = 1;
    clearImportList();
    playlistPopup.style.display = "none";
    overlay.style.display = "none";
  });
//  
//  addVideoModal.addEventListener("cancel", function(){
//    addVideoCancelButton.click();
//  });
//  
//  document.getElementById("settings-container").addEventListener("cancel", function(){
//    document.getElementById("settings-button").click();
//  });
//  
//  document.getElementById("edit-video-modal").addEventListener("cancel", function(){
//    cancelButton.click();
//  });
//  
//  document.getElementById("edit-video-modal").onkeypress = function(){
//    if(event.keyCode == KEYCODE_ENTER){
//      document.getElementById("edit-video-confirm-button").click();
//    }
//  };
//  
//  document.getElementById("edit-video-cancel-button").onclick = function(){
//    containerToRemove = undefined;
//    videoIndexToRemove = undefined;
//    settingsIndex = undefined;
//    overlay.style.display = "none";
//    document.getElementById("edit-video-modal").style.display = "none";
//  }
//  
//  document.getElementById("edit-video-confirm-button").onclick = function(){
//    var titleInput = document.getElementById("edit-title-input");
//    var artistInput = document.getElementById("edit-artist-input");
//    var startMin = document.getElementById("edit-start-input-min");
//    var startSec = document.getElementById("edit-start-input-sec");
//    var newStart = parseInt(startMin.value) * 60 + parseInt(startSec.value); 
//    var endMin = document.getElementById("edit-end-input-min");
//    var endSec = document.getElementById("edit-end-input-sec");
//    var newEnd = parseInt(endMin.value) * 60 + parseInt(endSec.value); 
//    containerToRemove.childNodes[1].innerHTML = titleInput.value;
//    containerToRemove.childNodes[2].innerHTML = artistInput.value;
//    var video = playlistPageManager.getVideoListManager().getVideoToBeEdited();
//    video.videoTitle = titleInput.value;
//    video.channelTitle = artistInput.value;
//
//    var start = video.duration.indexOf("PT") + 2;
//    var end = video.duration.indexOf("M");
//    var min = parseInt(video.duration.slice(start, end));
//    var sec = parseInt(video.duration.slice(end + 1, video.duration.indexOf("S")));
//    var duration = min * 60 + sec;
//    
//    if(newStart > newEnd){
//      newStart = 0;
//      newEnd = duration;
//    }
//    
//    if(newStart > duration){
//      video.startTime = 0;
//    }
//    else{
//      video.startTime = newStart;
//    }
//    
//    if(newEnd > duration){
//      video.endTime = duration;
//    }
//    else{
//      video.endTime = newEnd;
//    }
//    playlistCollectionManager.editVideo(video);
//    document.getElementById("edit-video-cancel-button").click();  
//  }
//  
//  document.getElementById("edit-start-input-min").oninput = function(){
//    if(document.getElementById("edit-start-input-min").value > document.getElementById("edit-start-input-min").max){
//      document.getElementById("edit-start-input-min").value = document.getElementById("edit-start-input-min").max;
//    }
//  }
//  
//  document.getElementById("edit-start-input-sec").oninput = function(){
//    if(document.getElementById("edit-start-input-sec").value > document.getElementById("edit-start-input-sec").max){
//      document.getElementById("edit-start-input-sec").value = document.getElementById("edit-start-input-sec").max;
//    }
//  }
//  
//  document.getElementById("edit-end-input-min").oninput = function(){
//    if(document.getElementById("edit-end-input-min").value > document.getElementById("edit-end-input-min").max){
//      document.getElementById("edit-end-input-min").value = document.getElementById("edit-end-input-min").max;
//    }
//  }
//  
//  document.getElementById("edit-end-input-sec").oninput = function(){
//    if(document.getElementById("edit-end-input-sec").value > document.getElementById("edit-end-input-sec").max){
//      document.getElementById("edit-end-input-sec").value = document.getElementById("edit-end-input-sec").max;
//    }
//  }
//  
//  timeBar.onmousedown = function(){
//    timeSliderDown = true;
//  }
//  
//  timeBar.onmouseup = function(){
//    timeSliderDown = false; 
//    var player = videoPlayerManager.getBackgroundVideoPlayer();
//    if(player.getPlayerState() != -1 && player.getVideoUrl() != "https://www.youtube.com/watch" &&
//       typeof videoPlayerManager.getQueue() != "undefined"){
//      videoPlayerManager.seekTo(this.value);
//      var currMins = Math.floor(this.value / 60);
//      var currSecs = Math.floor(this.value % 60);
//      if(currSecs < 10){
//        currTime.innerHTML = currMins + ":0" + currSecs;
//      }
//      else{
//        currTime.innerHTML = currMins + ":" + currSecs;
//      }
//    }
//    else{
//      timeBar.value = 0;
//      document.getElementById("control-time-bar-progress").style.width = "0%";
//    }
//  }
//  
//  timeBar.oninput = function(){
//    var timeBarLength = 145 - ((1 - (this.value / this.max)) * 145) - (15 * (this.value / this.max)) + "px";
//    
//    document.getElementById("control-time-bar-progress").style.width = timeBarLength;
//  }
  var clicked = false;
  var creatingPlaylist = false;
  infoBarButton.onclick = function(){
    if(clicked){
      videoList.classList.remove("shift-to-right-animation");
      playlistList.classList.remove("shift-to-left-animation");
      videoList.classList.add("shift-to-left-animation");
      playlistList.classList.add("shift-off-left-animation");
      clicked = false;
      if(window.getComputedStyle(document.getElementById("add-options")).display == "block"){
        document.getElementById("overlay").style.display = "none";
        document.getElementById("add-options").style.display = "none";
      }
    }
    else{
      videoList.classList.remove("shift-to-left-animation");
      playlistList.classList.remove("shift-off-left-animation");
      videoList.classList.add("shift-to-right-animation");
      playlistList.classList.add("shift-to-left-animation");
      clicked = true;
    }  
  }
  
  document.getElementById("add-playlist-options-button").onclick = function(e){
    if(e.path[0].id == "add-playlist-options-button"){
      if(window.getComputedStyle(document.getElementById("add-options")).display == "none"){
        if(window.getComputedStyle(document.getElementById("add-new-playlist-div")).display == "block"){
          document.getElementById("add-new-playlist-div").dispatchEvent(cancelEvent);
        }
        else{
          document.getElementById("overlay").style.display = "block";
          document.getElementById("add-options").style.display = "block";
        }
      }
      else{
        document.getElementById("overlay").style.display = "none";
        document.getElementById("add-options").style.display = "none";
      }
    }
  }
  document.getElementById("add-options").addEventListener("cancel", function(){
    document.getElementById("add-playlist-options-button").click();
  });
  document.getElementById("add-new-playlist").onclick = function(){
    document.getElementById("add-options").style.display = "none";
    document.getElementById("add-new-playlist-div").style.display = "block";
    document.getElementById("add-new-playlist-title-input").focus();
  };
  document.getElementById("add-new-playlist-div").addEventListener("cancel", function(){
    document.getElementById("add-new-playlist-div").style.display = "none";
    document.getElementById("add-new-playlist-title-input").value = "New Playlist";
    overlay.style.display = "none";
  });
  document.getElementById("add-new-playlist-title-input").onkeyup = function(e){
    if(e.keyCode == KEYCODE_ENTER){
      document.getElementById("add-new-playlist-button").click();
    }
  };
  document.getElementById("add-new-playlist-button").onclick = function(){
    var name = document.getElementById("add-new-playlist-title-input").value;
    // Create a playlist only if the given name is not empty
    if(name.replace(/\s/g, '').length){
      playlistGenerator.generateNewPlaylist(undefined, name, undefined, function(){

      });
      document.getElementById("add-new-playlist-div").dispatchEvent(cancelEvent);
    }
  }
  document.getElementById("import-new-playlist").onclick = function(){
    document.getElementById("add-options").style.display = "none";
    document.getElementById("playlist-popup").style.display = "block";
    document.getElementById("import-other-url-input").focus();
  };
}

function updateTimeBarValue(){
  if(typeof this.value == "number"){
    var currMins = Math.floor(this.value / 60);
    var currSecs = Math.floor(this.value % 60);
    if(currSecs < 10){
      currTime.innerHTML = currMins + ":0" + currSecs;
    }
    else{
      currTime.innerHTML = currMins + ":" + currSecs;
    }
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
    var player = videoPlayerManager.getBackgroundVideoPlayer();
    if(!timeSliderDown && player.getPlayerState() != videoPlayerManager.PAUSED){
      var timeElapsed = player.getCurrentTime();
      if(typeof timeElapsed == "number"){
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
      
      var playlist = playlistCollectionManager.getPlaylistCollection();
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
        playlistDiv.id = playlist[i].uid;
        playlistDiv.classList.add("playlist-selection-container-div", "button");
        playlistDiv.innerHTML = playlist[i].name;
        playlistSelectionContainer.appendChild(playlistDiv);
        playlistDiv.onclick = function(e){
          playlistSelectionContainer.style.display = "none";
          playlistCollectionManager.insertVideo(e.path[0].id, currSearchResultId);

          var id = "Playlist " + e.path[0].id + ":" + playlistCollectionManager.getPlaylist(e.path[0].id).name;
          var videoDisplay = document.getElementById(id).childNodes[1];
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
    var playlist = playlistCollectionManager.getPlaylist(uid);
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
    playlistCollectionManager.editPlaylist(currPlaylistLoaded);
  }
  cancelCreateButton.click();
}

function addPlaylistCreate(){
  var name = playlistInputField.value;
  var image = document.getElementById("playlistSetImageImage").src;
  var usingDefaultImage = (image.slice(-defaultPlaylistImage.length) == defaultPlaylistImage);
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

function removeVideo(){
  var length = playlistCollectionManager.getPlaylistLength(playlistCollectionManager.getViewingPlaylistUid());
  
  // If removing a video means that there will be no more videos in the playlist, reset the playlist image
  // to be the default one if the user didnt give the playlist a custom image
  if(length == 1){   
    if(!chrome.extension.getBackgroundPage().getPlaylistUsingDefaultImageByUid(
       playlistCollectionManager.getViewingPlaylistUid())){
      document.getElementById("player-image-image").src = defaultPlaylistImage;
    }
  }
  
  // Find the first available videoListPlayButton
  var firstAvailableIndex = -1;
  if(typeof playlistPageManager.viewingVideoListManager != "undefined"){
    var buttonsMap = playlistPageManager.viewingVideoListManager.playButtons;
    buttonsMap.forEach(function(value, key){
      if(value != null && firstAvailableIndex == -1){
        firstAvailableIndex = i;
      }
    })
  }

  var videoListManager = playlistPageManager.getVideoListManager();
  if(typeof videoListManager.getVideoToBeRemoved() != "undefined"){
    playlistCollectionManager.deleteVideo(videoListManager.getVideoToBeRemoved().uid);
    videoListManager.setVideoToBeRemoved(undefined);
  }
  
  var playlistName = playlistCollectionManager.getViewingPlaylist().name;
  containerToRemove.parentNode.removeChild(containerToRemove);
  var viewingPlaylist = playlistCollectionManager.getViewingPlaylistUid();
  var videoDisplay = document.getElementById("Playlist " + viewingPlaylist + ":" + playlistName).childNodes[1];
  var numVideos = chrome.extension.getBackgroundPage().getNumVideosByUid(viewingPlaylist);
  videoDisplay.innerHTML = numVideos + " Videos";
  videoIndexToRemove = undefined;
  containerToRemove = undefined;
  
}

function editVideo(){
  overlay.style.display = "block";
  var video = playlistPageManager.getVideoListManager().getVideoToBeEdited();
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

function displayPlaylists(){
  var numPlaylists = playlistCollectionManager.size();
  var playlistCollection = playlistCollectionManager.getPlaylistCollection();
  for(i = 0; i < playlistCollection.length; i++){
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
  /*
  var state = videoPlayerManager.getBackgroundVideoPlayer().getPlayerState();
  if(state > 0 && state < 5){    
    if(state != 2){
      controlPlayButton.style.display = "none";
      controlPauseButton.style.display = "block";
    }
    else{
      controlPlayButton.style.display = "block";
      controlPauseButton.style.display = "none";
    }
    if(typeof playlistCollectionManager.getPlayingPlaylistUid() != "undefined"){
      playlistPageManager.loadPlaylistPage(playlistCollectionManager.getPlayingPlaylistUid());
      initTimeBar(videoPlayerManager.getBackgroundVideoPlayer().getCurrentTime(),
                  videoPlayerManager.getBackgroundVideoPlayer().getDuration());
    }
  }
  */
  var numPlaylists = playlistCollectionManager.getPlaylistCollection().length;
  if(typeof playlistCollectionManager.getViewingPlaylistUid() != "undefined"){
    playlistPageManager.loadPlaylistPage(playlistCollectionManager.getViewingPlaylistUid());
  }
  else if(numPlaylists == 0){
    document.getElementById("no-playlist-page").style.display = "block";
  }
  else{
    infoBarButton.click();
  }
  quality = chrome.extension.getBackgroundPage().getInfo({id:"quality"});
}

function loadDivs(){
//  addPlaylistButton = document.getElementById("add-playlist-button");
//  addVideoButton = document.getElementById("add-video-button");
//  addVideoModal = document.getElementById("addVideoModal");
//  addVideoCancelButton = document.getElementById("addVideoCancelButton");
//  addVideoConfirmButton = document.getElementById("addVideoConfirmButton");
//  
  playlistPopup = document.getElementById("playlist-popup");
//  createPlaylistButton = document.getElementById("createPlaylistButton");
//  cancelCreateButton = document.getElementById("cancelPlaylistCreateButton");
//  
//  playlistInputField = document.getElementById("playlistInput");
//  searchInput = document.getElementById("searchInput");
//  searchButton = document.getElementById("searchButton");
  deletePlaylistPopup = document.getElementById("delete-playlist-popup");
  deletePlaylistPopupCancelButton = document.getElementById("delete-playlist-popup-cancel-button");
  deletePlaylistPopupConfirmButton = document.getElementById("delete-playlist-popup-confirm-button");
  overlay = document.getElementById("overlay");
//  videoList = document.getElementById("videos");
//  
//  
//  videoUrlInput = document.getElementById("urlInput");
//  
//  playPlaylistButton = document.getElementById("playPlaylistButton");
//  setImageButton = document.getElementById("playlistSetImageButton");
//  controlPlayButton = document.getElementById("control-play-button");
//  controlPauseButton = document.getElementById("control-pause-button");
//  controlRewindButton = document.getElementById("control-rewind-button");
//  controlFastForwardButton = document.getElementById("control-fast-forward-button");
//  controlRepeatButton = document.getElementById("control-repeat-button");
//  controlShuffleButton = document.getElementById("control-shuffle-button");
//  volumeBar = document.getElementById("volume-bar");
  
  importUser = document.getElementById("import-your-playlist");
  importUserContainer = document.getElementById("import-your-playlist-container");
  importOther = document.getElementById("import-other-playlist");
  importOtherContainer = document.getElementById("import-other-playlist-container");
  importOtherUrlInput = document.getElementById("import-other-url-input");
  
//  currTime = document.getElementById("control-time-curr");
//  endTime = document.getElementById("control-time-end");
//  timeBar = document.getElementById("control-time-bar");
  infoBarButton = document.getElementById("info-bar-button");
  videoList = document.getElementById("video-list");
  playlistList = document.getElementById("playlist-display");
}

function startPlaylist(video){
  videoPlayerManager.initQueue(video.uid);
  videoPlayerManager.startQueue();
  updateControlPanel(video);
}

function setupPlaylistSelectionContainer(){
  var playlistCollection = playlistCollectionManager.getPlaylistCollection();
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
      playlistDiv.id = playlistCollection[i].uid;
      playlistDiv.classList.add("playlist-selection-container-div", "button");
      playlistDiv.innerHTML = playlistCollection[i].name;
      div.appendChild(playlistDiv);
      playlistDiv.onclick = function(e){
        div.style.display = "none";
        playlistCollectionManager.insertVideo(e.path[0].id, currSearchResultId);
        var id = "Playlist " + e.path[0].id + ":" + playlistCollectionManager.getPlaylist(e.path[0].id).name;
        var videoDisplay = document.getElementById(id).childNodes[1];
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
  var buttons = playlistPageManager.viewingVideoListManager.playButtons;
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

function updatePlaylistPageImage(){
  document.getElementById("player-image-image").src = 
    chrome.extension.getBackgroundPage().getPlaylistImageByUid(playlistCollectionManager.getViewingPlaylistUid(),
                                                               SD_DEFAULT_IMG);
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
  playlistCollectionManager = chrome.extension.getBackgroundPage().getPlaylistCollectionManager();
  videoPlayerManager = chrome.extension.getBackgroundPage().getVideoPlayerManager();
  loadDivs();
  initListeners();
  //setupControlPanel();
  loadPlayerState();
  displayPlaylists();
  //setupPlaylistSelectionContainer();
  
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
  if(message.request == "createVideoDiv"){
    playlistPageManager.getVideoListManager().createVideoDiv(message.video, 
                                                             message.videoIndex);
    // If the newly inserted video is the only video in the playlist, then update the image for the playlist
    if(message.videoIndex == 0){
      document.getElementById("player-image-image").src =
        chrome.extension.getBackgroundPage().getPlaylistImageByUid(playlistCollectionManager.getViewingPlaylist(),
                                                                   SD_DEFAULT_IMG);
    }
  }
  else if(message.request == "initTimeBar"){
    stopTimeBar();
    initTimeBar(message.startTime, message.endTime);
  }
  else if(message.request = "playlistEnded"){
    updateControlPanelPlayButton(false);
  }
});

function setPlayingPlaylist(){
  playlistCollectionManager.setPlayingPlaylistUid(playlistCollectionManager.getViewingPlaylistUid());
}

window.addEventListener("load", onload, false);