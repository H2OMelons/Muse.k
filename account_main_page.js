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

var playlistCollectionManager; // Object gotten from background page to control playlists
var videoPlayerManager;

var currSelection = 1;

var cancelEvent = new Event("cancel");


var tag = document.createElement('script');
tag.src = "https://www.youtube.com/iframe_api";
var firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);



var playlistGenerator = new PlaylistGenerator();

/*----------------------------------------------------------------
 * PlaylistPageManager object that controls how the playlists
 * are loaded and displayed
 *----------------------------------------------------------------
 */

function PlaylistPageManager(){
  this.viewingVideoListManager = undefined;
  this.currPlaylist = undefined;
  this.currPlayingPlaylist = undefined;
  this.videoBarDisplayed = false;
  this.videoStatus = this.VIDEO_NOT_LOADED;
}

PlaylistPageManager.prototype.VIDEO_NOT_LOADED = 0;
PlaylistPageManager.prototype.VIDEO_LOADED = 1;

PlaylistPageManager.prototype.loadPlaylistPage = function(uid){
  videoPlayerManager.setPlaylistManager(playlistCollectionManager.getViewingManager());
  
  // Get info about the current video being played from the background page
  var playlistLength = chrome.extension.getBackgroundPage().getQueueLength();
  
  if(typeof this.currPlaylist != "undefined"){
    var id = "Playlist " + this.currPlaylist.uid + ":" + this.currPlaylist.name;
    var div = document.getElementById(id);
    if(typeof div != undefined & div != null){
      div.childNodes[0].style.color = "white";
    }
  }
  
  var playlist = playlistCollectionManager.getViewingPlaylist();
  this.currPlaylist = playlist;
  
  if(typeof this.currPlaylist != "undefined"){
    var id = "Playlist " + this.currPlaylist.uid + ":" + this.currPlaylist.name;
    var div = document.getElementById(id);
    if(typeof div != undefined && div != null){
      div.childNodes[0].style.color = "turquoise";
    }
  }
  
  document.getElementById("playlist-name").value = playlist.name;
  
  if(window.getComputedStyle(document.getElementById("info-bar-title")).display == "none"){
    document.getElementById("info-bar-title").style.display = "block";
  }
  
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

PlaylistPageManager.prototype.setPlayingPlaylist = function(playlist){
  if(typeof this.currPlayingPlaylist != "undefined"){
    var id = "Playlist " + this.currPlayingPlaylist.uid + ":" + this.currPlayingPlaylist.name;
    var div = document.getElementById(id);
    if(typeof div != undefined && div != null){
      div.childNodes[2].style.display = "none";
    }
  }
  this.currPlayingPlaylist = playlist;
  var id = "Playlist " + playlist.uid + ":" + playlist.name;
  var div = document.getElementById(id);
  if(typeof div != "undefined" && div != null){
    div.childNodes[2].style.display = "block";
  }
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
  this.videoToBeRemoved = undefined;
  this.videoToBeEdited = undefined;
  this.idCounter = 0;
}

VideoListManager.prototype.displayVideos = function(){
  var videos = this.playlist.videos;
  var videosUpdated = false;
  if(videos.length > 0){
    for(i = 0; i < videos.length; i++){
      if(videos[i] != -1){
        this.createVideoDiv(videos[i]);
      }
    }
    if(this.idCounter > 0){
      chrome.extension.getBackgroundPage().cleanVideoArrayByUid(this.playlist.uid);
    }
  }
}

VideoListManager.prototype.createVideoDiv = function(video){
  var index = this.idCounter;
  this.idCounter++;
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
  
  var title = document.createElement("text");
  title.classList.add("tiny-font", "left-column-video-title", "ellipsis");
  title.innerHTML = video.videoTitle;
  
  var manager = this;
  
  if((playlistCollectionManager.getPlayingPlaylistUid() == playlistCollectionManager.getViewingPlaylistUid())){
    videoPlayerManager.setPlayButtons(manager.playButtons);
    var videoBeingPlayedUid = videoPlayerManager.getVideoBeingPlayed().uid;
    if((video.uid == videoBeingPlayedUid) &&
       (videoPlayerManager.getBackgroundVideoPlayer().getPlayerState() == videoPlayerManager.PLAYING)){
      playContainer.style.display = "none";
      pauseContainer.style.display = "block";
      title.style.color = "turquoise";
    }
    else if((video.uid == videoBeingPlayedUid) &&
       (videoPlayerManager.getBackgroundVideoPlayer().getPlayerState() == videoPlayerManager.PAUSED)){
      title.style.color = "turquoise";
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
  
  playContainer.onclick = function(e){

      if(playlistCollectionManager.getPlayingPlaylistUid() == playlistCollectionManager.getViewingPlaylistUid()){
        manager.playButtons.forEach(function(value, key){
          if(value.childNodes[0].style.display != "block"){
            value.childNodes[0].style.display = "block";
            value.childNodes[1].style.display = "none";
            value.parentNode.childNodes[3].style.color = "white";
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
        manager.videoBeingPlayed.parentNode.childNodes[3].style.color = "white";
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
      title.style.color = "turquoise";
  };
  
  pauseContainer.onclick = function(e){
      videoPlayerManager.pauseVideo();
      updateControlPanelPlayButton(false);
      playContainer.style.display = "block";
      pauseContainer.style.display = "none";
  }
  
  this.playButtons.set(video.uid, playButton);
  
  

  container.onclick = function(e){
    if(e.path[0].parentNode.parentNode.id != "videoSettings" &&
       !e.path[0].classList.contains("video-play-button") &&
       !e.path[0].classList.contains("video-pause-button") &&
       !e.path[0].classList.contains("fa-play") &&
       !e.path[0].classList.contains("fa-pause")){
      if(playContainer.style.display == "block"){
        playContainer.click();
      }
      else{
        pauseContainer.click();
      }
    }
  }
  
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
  deleteContainer.classList.add("video-delete", "button", "turquoise-hover");
  var deleteVideo = document.createElement("i");
  deleteVideo.classList.add("fa", "fa-trash-o", "large-font");
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
  editContainer.classList.add("video-edit", "button", "turquoise-hover");
  var edit = document.createElement("i");
  edit.classList.add("fa", "fa-pencil-square-o", "large-font");
  edit.setAttribute("aria-hidden", "true");
  editContainer.appendChild(edit);
  settings.appendChild(editContainer);
  
  editContainer.onclick = function(){
    overlay.style.display = "block";
    containerToRemove = container;
    playlistPageManager.getVideoListManager().setVideoToBeEdited(video);
    var editVideoDiv = document.getElementById("edit-video-modal");
    editVideoDiv.style.display = "block";
    var titleInput = document.getElementById("edit-title-input");
    titleInput.value = video.videoTitle;
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

function SearchManager(){
  this.searchSelections = new Map();
  this.numToRemove = 0;
}

SearchManager.prototype.search = function(keyword){
  var tempThis = this;
  
  this.clearSearchDisplay();
  chrome.extension.getBackgroundPage().search(keyword, function(item){
    if(typeof item.items != "undefined"){ 
      if(window.getComputedStyle(document.getElementById("search-container")).display == "none"){
        document.getElementById("search-container").style.display = "block";
        document.getElementById("search-cancel-button").style.display = "block";
      }
      for(i = 0; i < item.items.length; i++){
        tempThis.createSearchResultDiv(item.items[i]);
      }
    }
    else if(typeof item.error != "undefined"){
      popupManager.createErrorPopup(item.error.message);
    }
  });
}

SearchManager.prototype.clearSearchDisplay = function(){
  var displayContainer = document.getElementById("search-results-container");
  while(displayContainer.firstChild){
    displayContainer.removeChild(displayContainer.firstChild);
  }
}

SearchManager.prototype.clearSelections = function(){
  var container = document.getElementById("selected-videos-display");
  while(container.firstChild){
    container.removeChild(container.firstChild);
  }
}

SearchManager.prototype.clearAddedSelections = function(){
  var container = document.getElementById("selected-videos-display");
  var i;
  var removeSelectionsOff = 
      window.getComputedStyle(document.getElementById("remove-all-selected-videos-button")).display == "none";
  this.searchSelections.forEach(function(value, key){
    value.click();
    container.removeChild(value);
  });
  if(removeSelectionsOff){
    document.getElementById("remove-all-selected-videos-button").style.display = "none";
  }
}

var currSearchResultId = undefined;
var selectedSearchResults = undefined;
SearchManager.prototype.createSearchResultDiv = function(videoInfo){
  var searchResultsContainer = document.createElement("div");
  searchResultsContainer.classList.add("video-result", "border");
  var searchResultsTitle = document.createElement("text");
  searchResultsTitle.innerHTML = videoInfo.snippet.title;
  searchResultsTitle.classList.add("video-result-description", "white");
  var searchResultsImg = document.createElement("img");
  searchResultsImg.classList.add("video-result-img")
  if(typeof videoInfo.snippet.thumbnails.high.url != "undefined"){
    searchResultsImg.src = videoInfo.snippet.thumbnails.high.url;
  }
  else if(typeof videoInfo.snippet.thumbnails.medium.url != "undefined"){
    searchResultsImg.src = videoInfo.snippet.thumbnails.medium.url;
  }
  else{
    searchResultsImg.src = videoInfo.snippet.thumbnails.default.url;
  }
  
  var searchResultCheck = document.createElement("i");
  searchResultCheck.classList.add("fa", "fa-check", "border", "video-result-check", 
                                  "turquoise", "black-background", "circle-background", "large-font");
  searchResultCheck.style.display = "none";
  
  var searchResultXContainer = document.createElement("div");
  searchResultXContainer.classList.add("border", "video-result-check", "video-result-x", "red",
                                       "black-background", "circle-background");
  var searchResultX = document.createElement("i");
  searchResultX.classList.add("fa", "fa-times-circle-o", "large-font", "black-background", "circle-background");
  searchResultX.style.position = "absolute";
  searchResultX.style.height = "18px";
  searchResultX.style.fontSize = "20px";
  searchResultXContainer.appendChild(searchResultX);
  
  searchResultsContainer.appendChild(searchResultsImg);
  searchResultsContainer.appendChild(searchResultCheck);
  searchResultsContainer.appendChild(searchResultsTitle);
  searchResultsContainer.appendChild(searchResultXContainer);
  
  var tempThis = this;
  searchResultsContainer.onclick = function(e){
    if(window.getComputedStyle(this.childNodes[1]).display == "none"){
      this.childNodes[1].style.display = "block";
      var clone = searchResultsContainer.cloneNode(true);
      
      clone.onclick = function(){
        if(window.getComputedStyle(this.childNodes[1]).display == "none"){
          searchResultsContainer.childNodes[1].style.display = "block";
          this.childNodes[1].style.display = "block";
          this.childNodes[3].style.display = "none";
          tempThis.numToRemove--;
          if(!tempThis.searchSelections.has(videoInfo.id.videoId)){
            tempThis.searchSelections.set(videoInfo.id.videoId, clone);
          }
          if(tempThis.searchSelections.size == 1){
            document.getElementById("add-all-selected-videos-button").style.display = "block";
          }
          if(tempThis.numToRemove <= 0){
            document.getElementById("remove-all-selected-videos-button").style.display = "none";
          }
        }
        else{
          searchResultsContainer.childNodes[1].style.display = "none";
          this.childNodes[1].style.display = "none";
          this.childNodes[3].style.display = "block";
          tempThis.numToRemove++;
          if(tempThis.searchSelections.has(videoInfo.id.videoId)){
            tempThis.searchSelections.delete(videoInfo.id.videoId);
          }
          if(tempThis.searchSelections.size == 0){
            document.getElementById("add-all-selected-videos-button").style.display = "none";
          }
          if(tempThis.numToRemove == 1){
            document.getElementById("remove-all-selected-videos-button").style.display = "block";  
          }
        }
      }
      if(!tempThis.searchSelections.has(videoInfo.id.videoId)){
        tempThis.searchSelections.set(videoInfo.id.videoId, clone);
      }
      if(tempThis.searchSelections.size == 1){
        document.getElementById("add-all-selected-videos-button").style.display = "block";
      }
      document.getElementById("selected-videos-display").appendChild(clone);
    }
    else{
      this.childNodes[1].style.display = "none";
      var clone = tempThis.searchSelections.get(videoInfo.id.videoId);
      if(tempThis.searchSelections.has(videoInfo.id.videoId)){
        tempThis.searchSelections.delete(videoInfo.id.videoId);
      }
      if(tempThis.searchSelections.size == 0){
        document.getElementById("add-all-selected-videos-button").style.display = "none";
      }
      document.getElementById("selected-videos-display").removeChild(clone);
    }
  }
  
  document.getElementById("search-results-container").appendChild(searchResultsContainer);
}

SearchManager.prototype.getVideoIdList = function(){
  var keys = [];
  this.searchSelections.forEach(function(value, key){
    keys.push(key);
  });
  return keys;
}

function PopupManager(){
  this.durationOpen = 5000;
  this.popupsList = [];
}
PopupManager.prototype.MAX_POPUPS = 5;
PopupManager.prototype.SUCCESS = "Success";
PopupManager.prototype.WARNING = "Warning";
PopupManager.prototype.ERROR = "Error";

PopupManager.prototype.createPopup = function(type, details){
  var container = document.createElement("div");
  container.classList.add("alert-popup", "border", "card-background");
  
  var date = new Date();
  container.id = date.getTime();
  var title = document.createElement("text");
  title.classList.add("alert-popup-result", "center");
  if(type == this.SUCCESS){
    title.classList.add("success");
  }
  else if(type == this.ERROR){
    title.classList.add("error");
  }
  else if(type == this.WARNING){
    title.classList.add("warning");
  }
  title.innerHTML = type;
  var closeButton = document.createElement("i");
  closeButton.classList.add("fa", "fa-times", "dismiss-button", "button", "white", "turquoise-hover");
  var timeout;
  var tempThis = this;
  closeButton.onclick = function(){
    var i;
    var length;
    if(tempThis.MAX_POPUPS > tempThis.popupsList.length){
      length = tempThis.popupsList.length;
    }
    else{
      length = tempThis.MAX_POPUPS;
    }
    for(i = 0; i < length; i++){
      tempThis.popupsList[i].style.bottom = (46 + (100 * i)) + "px";
      if(tempThis.popupsList[i].style.display == "none"){
        tempThis.popupsList[i].style.display = "block";
      }
      if(tempThis.popupsList[i] == container){
        tempThis.popupsList.splice(i, 1);
        i--;
        if(tempThis.popupsList.length <= tempThis.MAX_POPUPS){
          length--;
        }
      }
    }
    if(typeof timeout != "undefined" && timeout != null){
      clearTimeout(timeout);
    }
    container.parentNode.removeChild(container);
  }
  container.onmouseover = function(){
    clearTimeout(timeout);
  }
  container.onmouseleave = function(){
    timeout = setTimeout(function(){
      closeButton.click();
    }, tempThis.durationOpen);
  }
  var detailsDisplay = document.createElement("text");
  detailsDisplay.classList.add("alert-popup-details", "tiny-font", "center");
  detailsDisplay.innerHTML = details;
  container.appendChild(title);
  container.appendChild(closeButton);
  container.appendChild(detailsDisplay);
  if(this.popupsList.length < this.MAX_POPUPS){
    container.style.bottom = (46 + (100 * (this.popupsList.length))) + "px";
    document.body.appendChild(container);
  }
  else{
    container.style.display = "none";
    document.body.appendChild(container);
  }
  
  this.popupsList.push(container);
  timeout = setTimeout(function(){
    closeButton.click();
  }, this.durationOpen);
}
PopupManager.prototype.createSuccessPopup = function(details){
  this.createPopup(this.SUCCESS, details);
}

PopupManager.prototype.createErrorPopup = function(details){
  this.createPopup(this.ERROR, details);
}

PopupManager.prototype.createWarningPopup = function(details){
  this.createPopup(this.WARNING, details);
}

PopupManager.prototype.addButtonToPopup = function(buttonText, buttonOnclick){
  var button = document.createElement("div");
  button.classList.add("alert-popup-button", "tiny-font", "border", "white", "center", "button", "black-white-button-hover");
  button.innerHTML = buttonText;
  var tempThis = this;
  button.onclick = function(){
    buttonOnclick();
    tempThis.popupsList[tempThis.popupsList.length - 1].childNodes[1].click();
  };
  this.popupsList[this.popupsList.length - 1].appendChild(button);
}

var popupManager = new PopupManager();

var searchManager = new SearchManager();

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
      var uid = playlistCollectionManager.getViewingPlaylistUid();
      playlistCollectionManager.insertVideo(uid, videoId);
      var id = "Playlist " + uid + ":" + playlistCollectionManager.getPlaylist(uid).name;
      var videoDisplay = document.getElementById(id).childNodes[1];
      var numVideos = parseInt(videoDisplay.innerHTML.substr(0, videoDisplay.innerHTML.indexOf("V") - 1)) + 1;
      videoDisplay.innerHTML = numVideos + " Videos";
      popupManager.createSuccessPopup("Video successfully added");
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
  addVideoModal.addEventListener("cancel", function(){
    addVideoCancelButton.click();
  });
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
      if(typeof playlistPageManager.viewingVideoListManager != "undefined"){
        var buttonsMap = playlistPageManager.viewingVideoListManager.playButtons;
        buttonsMap.forEach(function(value, key){
          value.parentNode.parentNode.removeChild(value.parentNode);  
        });
        playlistPageManager.viewingVideoListManager = undefined;
      }
      document.getElementById("playlist-name").value = "";
    }
    if(playlistCollectionManager.getPlaylistCollectionLength() == 0){
      document.getElementById("no-playlist-page").style.display = "block";
    }
    // Reset UI to normal
    playlistCollectionManager.setEditingPlaylistUid(undefined);
    editPlaylistId = undefined;
    deletePlaylistPopup.style.display = "none";
    overlay.style.display = "none";
  }
  
  // Clicks the create playlist button when user hits enter key
  searchInput.onkeyup = function(){
    if(event.keyCode == KEYCODE_ENTER){
      searchButton.click();
    }
  };

  searchButton.onclick = function(){
    var keywords = searchInput.value;
    if(keywords.length != 0 && keywords.replace(/\s/g, '').length != 0){
      searchManager.search(keywords);
    }
  };

  document.getElementById("remove-all-selected-videos-button").onclick = function(){
    var container = document.getElementById("selected-videos-display");
    var i;
    for(i = container.childNodes.length - 1; i >= 0; i--){
      // If the red x is displayed, then that means we need to get rid of this div
      if(window.getComputedStyle(container.childNodes[i].childNodes[3]).display == "block"){
        container.removeChild(container.childNodes[i]);
        searchManager.numToRemove--;
      }
    }
  };
  
  document.getElementById("add-all-selected-videos-button").onclick = function(){
    document.getElementById("add-video-playlist-selection-modal").style.display = "block";
    overlay.style.display = "block";
    var playlistCollection = playlistCollectionManager.getPlaylistCollection();
    var container = document.getElementById("add-video-playlist-selection-display");
    var i;
    for(i = 0; i < playlistCollection.length; i++){
      var div = document.createElement("div");
      div.classList.add("add-video-to-playlist-button", "turquoise", "button", "regular-font", 
                        "ellipsis");
      div.id = playlistCollection[i].uid;
      var txt = document.createElement("text");
      txt.classList.add("turquoise-hover");
      txt.innerHTML = playlistCollection[i].name;
      div.appendChild(txt);
      container.appendChild(div);
      
      div.onclick = function(){
        var videoResults = playlistGenerator.idToRawVideoListAdapter(searchManager.getVideoIdList());
        document.getElementById("add-video-playlist-selection-modal").dispatchEvent(cancelEvent);
        var divId = this.id;
        playlistGenerator.addRawVideosToPlaylist(videoResults, undefined, divId, function(videos){
          var playlist = playlistCollectionManager.getPlaylist(divId);
          var id = "Playlist " + divId + ":" + playlist.name;
          var container = document.getElementById(id);
          if(typeof container != "undefined"){
            var videoLengthDisplay = container.childNodes[1];
            if(playlist.videos.length == 1){
              videoLengthDisplay.innerHTML = playlist.videos.length + " Video";
            }
            else{
              videoLengthDisplay.innerHTML = playlist.videos.length + " Videos";
            }
          }
          if(divId == playlistCollectionManager.getViewingPlaylistUid()){
            var i;
            for(i = 0; i < videos.length; i++){
              playlistPageManager.getVideoListManager().createVideoDiv(videos[i]);
            }
          }
          var numRemoved = videoResults.length - videos.length;
          if(numRemoved > 0){
            popupManager.createSuccessPopup("Videos successfully added but " + numRemoved + " videos were removed");
          }
          else{
            popupManager.createSuccessPopup("Videos successfully added");
          }
        });
        searchManager.clearAddedSelections();
      }
    }
  }
  
  document.getElementById("add-video-to-new-playlist-button").onclick = function(){
    var videoResults = playlistGenerator.idToRawVideoListAdapter(searchManager.getVideoIdList());
    document.getElementById("add-video-playlist-selection-modal").dispatchEvent(cancelEvent);
    playlistGenerator.processRawVideoList(videoResults, undefined, function(numRemoved){
      if(numRemoved > 0){
        popupManager.createSuccessPopup("Videos successfully added but " + numRemoved + " videos were removed");
      }
      else{
        popupManager.createSuccessPopup("Videos successfully added");
      }
    });
    searchManager.clearAddedSelections();
  };
  
  document.getElementById("add-video-playlist-selection-modal").addEventListener("cancel", function(){
    document.getElementById("add-video-playlist-selection-modal").style.display = "none";
    overlay.style.display = "none";
    var container = document.getElementById("add-video-playlist-selection-display");
    while(container.firstChild){
      container.removeChild(container.firstChild);
    }
  });
  
  document.getElementById("search-cancel-button").onclick = function(){
    document.getElementById("search-input").value = "";
    document.getElementById("search-container").style.display = "none";
    document.getElementById("search-cancel-button").style.display = "none";
    document.getElementById("view-all-selected-videos-up-button").style.display = "block";
    document.getElementById("view-all-selected-videos-down-button").style.display = "none";
    document.getElementById("add-all-selected-videos-button").style.display = "none";
    document.getElementById("remove-all-selected-videos-button").style.display = "none";
    if(document.getElementById("search-options").classList.contains("shift-to-top-animation")){
      document.getElementById("search-options").classList.remove("shift-to-top-animation");
      document.getElementById("search-options").classList.add("shift-to-bot-animation")
    }
    if(document.getElementById("search-options").classList.contains("shift-to-bot-animation")){
      document.getElementById("search-options").classList.remove("shift-to-bot-animation")
    }
    searchManager.clearSelections();
  }
  
  document.getElementById("view-all-selected-videos-button").onclick = function(){
    if(document.getElementById("search-options").classList.contains("shift-to-top-animation")){
      document.getElementById("search-options").classList.remove("shift-to-top-animation");
      document.getElementById("search-options").classList.add("shift-to-bot-animation");
      document.getElementById("view-all-selected-videos-up-button").style.display = "block";
      document.getElementById("view-all-selected-videos-down-button").style.display = "none";
    }
    else{
      document.getElementById("search-options").classList.add("shift-to-top-animation");
      document.getElementById("search-options").classList.remove("shift-to-bot-animation");
      document.getElementById("view-all-selected-videos-up-button").style.display = "none";
      document.getElementById("view-all-selected-videos-down-button").style.display = "block";
    }
    
  }
  
  controlPlayButton.onclick = function(){
    if(videoPlayerManager.getBackgroundVideoPlayer().getPlayerState() == videoPlayerManager.PAUSED){
      updateControlPanelPlayButton(true);
      videoPlayerManager.playVideo();
    }
  }
  controlPauseButton.onclick = function(){
    if(videoPlayerManager.getBackgroundVideoPlayer().getPlayerState() == videoPlayerManager.PLAYING ||
       videoPlayerManager.getBackgroundVideoPlayer().getPlayerState() == videoPlayerManager.BUFFERING){
      updateControlPanelPlayButton(false);
      videoPlayerManager.pauseVideo();
    }
  }
  controlFastForwardButton.onclick = function(){
    videoPlayerManager.fastForward();
  }
  controlRewindButton.onclick = function(){
    videoPlayerManager.rewind();
  }
  
  controlRepeatButton.onclick = function(){
    var repeatOn = chrome.extension.getBackgroundPage().getInfo({id:"repeatStatus"});
    if(repeatOn){
      controlRepeatButton.style.color = "white";
    }
    else{
      controlRepeatButton.style.color = "turquoise";
    }
    chrome.extension.getBackgroundPage().setRepeat(!repeatOn);
  }
  controlShuffleButton.onclick = function(){
    var shuffleOn = chrome.extension.getBackgroundPage().getInfo({id:"shuffleStatus"});
    if(shuffleOn){
      controlShuffleButton.style.color = "white";
    }
    else{
      controlShuffleButton.style.color = "turquoise";
    }
    chrome.extension.getBackgroundPage().setShuffle(!shuffleOn);
  }
  
  volumeBar.onclick = function(e){
    if(document.getElementById("volume-on").style.display != "none"){
      var volume = Math.abs(e.pageY - 536);

      document.getElementById("volume-bar-fill").style.height = volume + "px";
      // Convert volume to be in range 0-100
      volume = Math.round((volume / 50) * 100);
      chrome.extension.getBackgroundPage().setVolume({"volume": volume, "mute": false});
    }
  }
  
  document.getElementById("volume-container").onmouseleave = function(){
    volumeBar.style.display = "none";
  }
  
  document.getElementById("volume-icon").onmouseover = function(){
    volumeBar.style.display = "block";
  }
  
  document.getElementById("volume-on").onclick = function(){
    document.getElementById("volume-on").style.display = "none";
    document.getElementById("volume-off").style.display = "block";
    document.getElementById("volume-bar-fill").style.height = "0px";
    var volume = chrome.extension.getBackgroundPage().getVolume().volume;
    chrome.extension.getBackgroundPage().setVolume({"volume": volume, "mute": true});
  }
  
  document.getElementById("volume-off").onclick = function(){
    document.getElementById("volume-on").style.display = "block";
    document.getElementById("volume-off").style.display = "none";
    var volume = chrome.extension.getBackgroundPage().getVolume().volume;
    chrome.extension.getBackgroundPage().setVolume({"volume": volume, "mute": false});
    document.getElementById("volume-bar-fill").style.height = (volume / 2) + "px";
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
    document.getElementById("back-button").style.display = "block";
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
    
    if(typeof results.items == "undefined"){
      return;
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
    document.getElementById("back-button").style.display = "block";
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
  
  document.getElementById("display-all-selection-import-button").onclick = function(){
    
    for(i = 0; i < userImportChoices.length; i++){
      if(userImportChoices[i]){
        document.getElementById("url-selection-load").style.display = "block";
        playlistGenerator.processRawPlaylistList(userPlaylistResults, userImportChoices, function(numRemoved){
          if(numRemoved > 0){
            popupManager.createSuccessPopup("Playlists successfully added but " + numRemoved + " videos were removed");
          }
          else{
            popupManager.createSuccessPopup("Playlists successfully added");
          }
          document.getElementById("url-selection-load").style.display = "none";
          document.getElementById("display-all-selection-results-buttons").style.display = "none";
          document.getElementById("url-selection-success").style.display = "block";
          if(playlistCollectionManager.getPlaylistCollectionLength() == 1){
            document.getElementById("no-playlist-page").style.display = "none";
          }
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
      document.getElementById("back-button").style.display = "none";
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
    var playlistName = document.getElementById("import-other-name-input").value;
    if(playlistName.replace(/\s/g, '').length == 0){
      playlistName = "New Playlist";
    }
    playlistGenerator.processRawVideoList(filteredVideoList, playlistName, function(numRemoved){
      document.getElementById("import-other-load").style.display = "none";
      document.getElementById("import-other-success").style.display = "block";
      document.getElementById("import-other-url-input").style.display = "none";
      if(playlistCollectionManager.getPlaylistCollectionLength() == 1){
        document.getElementById("no-playlist-page").style.display = "none";
      }
      if(numRemoved > 0){
        popupManager.createSuccessPopup("Videos successfully added but " + numRemoved + " videos removed");
      }
      else{
        popupManager.createSuccessPopup("Videos successfully added");
      }
      document.getElementById("import-other-name-input").value = "New Playlist";
    });
  }
  
  document.getElementById("url-selection-results-button").onclick = function(){
    document.getElementById("url-selection-load").style.display = "none";
    document.getElementById("url-selection-results-button").style.display = "none";
    document.getElementById("url-selection-results-cancel-button").style.display = "none";
    document.getElementById("url-selection-results-container").style.display = "none";
    var filteredVideoList = playlistGenerator.filterVideoList(resultsList, importList);
    playlistGenerator.processRawVideoList(filteredVideoList, undefined, function(numRemoved){
      document.getElementById("url-selection-load").style.display = "none";
      document.getElementById("url-selection-success").style.display = "block";
      if(playlistCollectionManager.getPlaylistCollectionLength() == 1){
        document.getElementById("no-playlist-page").style.display = "none";
      }
      if(numRemoved > 0){
        popupManager.createSuccessPopup("Videos successfully added but " + numRemoved + " videos removed");
      }
      else{
        popupManager.createSuccessPopup("Videos successfully added");
      }
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
  
  document.getElementById("back-button").onclick = function(){
    document.getElementById("back-button").style.display = "none";
    document.getElementById("url-selection-button-container").style.display = "block";
    document.getElementById("url-selection-container").style.display = "none";
    document.getElementById("display-all-selection-container").style.display = "none";
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
    var startMin = document.getElementById("edit-start-input-min");
    var startSec = document.getElementById("edit-start-input-sec");
    var newStart = parseInt(startMin.value) * 60 + parseInt(startSec.value); 
    var endMin = document.getElementById("edit-end-input-min");
    var endSec = document.getElementById("edit-end-input-sec");
    var newEnd = parseInt(endMin.value) * 60 + parseInt(endSec.value); 
    containerToRemove.childNodes[3].innerHTML = titleInput.value;
    var video = playlistPageManager.getVideoListManager().getVideoToBeEdited();
    video.videoTitle = titleInput.value;

    var start = video.duration.indexOf("PT") + 2;
    var end = video.duration.indexOf("M");
    var min = parseInt(video.duration.slice(start, end));
    var sec = parseInt(video.duration.slice(end + 1, video.duration.indexOf("S")));
    var duration = min * 60 + sec;
    
    if(newStart > newEnd){
      newStart = 0;
      newEnd = duration;
    }
    
    if(newStart > duration){
      video.startTime = 0;
    }
    else{
      video.startTime = newStart;
    }
    
    if(newEnd > duration){
      video.endTime = duration;
    }
    else{
      video.endTime = newEnd;
    }
    containerToRemove = undefined;
    playlistCollectionManager.editVideo(video);
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
    var player = videoPlayerManager.getBackgroundVideoPlayer();
    if(player.getPlayerState() != -1 && player.getVideoUrl() != "https://www.youtube.com/watch" &&
       typeof videoPlayerManager.getQueue() != "undefined"){
      videoPlayerManager.seekTo(this.value);
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
    var timeBarLength = Math.ceil(145 - ((1 - (this.value / this.max)) * 145) - (15 * (this.value / this.max))) + "px";
    
    document.getElementById("control-time-bar-progress").style.width = timeBarLength;
  }
  var clicked = false;
  var creatingPlaylist = false;
  infoBarButton.onclick = function(){
    // Clicked means that the playlist display is displayed
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
  
  document.getElementById("info-bar-edit-button").onclick = function(){
    if(document.getElementById("playlist-name").getAttribute("disabled")){
      document.getElementById("playlist-name").disabled = false;
      document.getElementById("playlist-name").focus();
    }
    else{
      document.getElementById("playlist-name").setAttribute("disabled", true);
      playlistCollectionManager.editViewingPlaylist(document.getElementById("playlist-name").value);
    }
  }
  
  document.getElementById("playlist-name").onkeyup = function(e){
    if(e.keyCode == KEYCODE_ENTER){
      document.getElementById("info-bar-edit-button").click();
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
  document.getElementById("create-playlist-button").onclick = function(){
    if(!clicked){
      infoBarButton.click();
    }
    document.getElementById("add-playlist-options-button").click();  
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
        popupManager.createSuccessPopup("Playlist successfully created");
        if(playlistCollectionManager.getPlaylistCollectionLength() == 1){
          document.getElementById("no-playlist-page").style.display = "none";
        }
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

function resetTimeBar(){
  stopTimeBar();
  currTime.innerHTML = "";
  endTime.innerHTML = "";
  timeBar.value = 0;
}

function setImportDisplay(defaultDisplay, userDisplay, otherDisplay){
  importDefault.style.borderBottom = defaultDisplay.border;
  importDefaultContainer.style.display = defaultDisplay.display;
  importUser.style.borderBottom = userDisplay.border;
  importUserContainer.style.display = userDisplay.display;
  importOther.style.borderBottom = otherDisplay.border;
  importOtherContainer.style.display = otherDisplay.display;
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
  
  var playerObj = videoPlayerManager.getBackgroundVideoPlayer();
  var state = -1; 
  if(typeof playerObj != "undefined"){
    playerObj.getPlayerState();
  }
  if(state > 0 && state < 5){    
    if(state != 2){
      controlPlayButton.style.display = "none";
      controlPauseButton.style.display = "block";
    }
    else{
      controlPlayButton.style.display = "block";
      controlPauseButton.style.display = "none";
    }
  }
  
  var numPlaylists = playlistCollectionManager.getPlaylistCollection().length;
  if(typeof playlistCollectionManager.getPlayingPlaylistUid() != "undefined"){
    playlistPageManager.loadPlaylistPage(playlistCollectionManager.getPlayingPlaylistUid());
    playlistPageManager.setPlayingPlaylist(playlistCollectionManager.getPlayingPlaylist());
    initTimeBar(videoPlayerManager.getBackgroundVideoPlayer().getCurrentTime(),
                videoPlayerManager.getBackgroundVideoPlayer().getDuration());
  }
  else if(typeof playlistCollectionManager.getViewingPlaylistUid() != "undefined"){
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
  addVideoButton = document.getElementById("info-bar-add-video-button");
  addVideoModal = document.getElementById("addVideoModal");
  addVideoCancelButton = document.getElementById("addVideoCancelButton");
  addVideoConfirmButton = document.getElementById("addVideoConfirmButton");
  
  playlistPopup = document.getElementById("playlist-popup");
  searchInput = document.getElementById("search-input");
  searchButton = document.getElementById("search-button");
  deletePlaylistPopup = document.getElementById("delete-playlist-popup");
  deletePlaylistPopupCancelButton = document.getElementById("delete-playlist-popup-cancel-button");
  deletePlaylistPopupConfirmButton = document.getElementById("delete-playlist-popup-confirm-button");
  overlay = document.getElementById("overlay"); 
  videoUrlInput = document.getElementById("urlInput");
  controlPlayButton = document.getElementById("control-play-button");
  controlPauseButton = document.getElementById("control-pause-button");
  controlRewindButton = document.getElementById("control-rewind-button");
  controlFastForwardButton = document.getElementById("control-fast-forward-button");
  controlRepeatButton = document.getElementById("control-repeat-button");
  controlShuffleButton = document.getElementById("control-shuffle-button");
  volumeBar = document.getElementById("volume-bar");
  
  importUser = document.getElementById("import-your-playlist");
  importUserContainer = document.getElementById("import-your-playlist-container");
  importOther = document.getElementById("import-other-playlist");
  importOtherContainer = document.getElementById("import-other-playlist-container");
  importOtherUrlInput = document.getElementById("import-other-url-input");
  
  currTime = document.getElementById("control-time-curr");
  endTime = document.getElementById("control-time-end");
  timeBar = document.getElementById("control-time-bar");
  infoBarButton = document.getElementById("info-bar-button");
  videoList = document.getElementById("video-list");
  playlistList = document.getElementById("playlist-display");
  document.getElementById("playlist-name").setAttribute("disabled", true);
}

function startPlaylist(video){
  videoPlayerManager.initQueue(video.uid);
  videoPlayerManager.startQueue();
  updateControlPanel(video);
}

function setupControlPanel(){
  var repeatOn = chrome.extension.getBackgroundPage().getInfo({id:"repeatStatus"});
  if(repeatOn){
    controlRepeatButton.style.color = "turquoise";
  }
  else{
    controlRepeatButton.style.color = "white";
  }
  var shuffleOn = chrome.extension.getBackgroundPage().getInfo({id:"shuffleStatus"});
  if(shuffleOn){
    controlShuffleButton.style.color = "turquoise";
  }
  else{
    controlShuffleButton.style.color = "white";
  }
  
  var volume = chrome.extension.getBackgroundPage().getVolume();
  if(volume.mute){
    document.getElementById("volume-on").style.display = "none";
    document.getElementById("volume-off").style.display = "block";
    document.getElementById("volume-bar-fill").style.height = "0px";
  }
  else{
    document.getElementById("volume-on").style.display = "block";
    document.getElementById("volume-off").style.display = "none";
    document.getElementById("volume-bar-fill").style.height = (volume.volume / 2) + "px";
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

function onload(){
  playlistCollectionManager = chrome.extension.getBackgroundPage().getPlaylistCollectionManager();
  videoPlayerManager = chrome.extension.getBackgroundPage().getVideoPlayerManager();
  loadDivs();
  initListeners();
  setupControlPanel();
  displayPlaylists();
  loadPlayerState();
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
    playlistPageManager.getVideoListManager().createVideoDiv(message.video);
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
  else if(message.request == "resetTimeBar"){
    resetTimeBar();
  }
  else if(message.request == "playlistEnded"){
    updateControlPanelPlayButton(false);
  }
  else if(message.request == "updateControlButton"){
    updateControlPanelPlayButton(message.play);
  }
  else if(message.request == "videoNotPlayablePopup"){
    var title = message.video.videoTitle;
    var button = undefined;
    if(message.remove){
      button = videoPlayerManager.getPlayButton(message.id);
    }
    if(title.length > 20){
      title = title.slice(0, 20);
      title += "...";
    }
    popupManager.createErrorPopup(title + "<br> not available for playback on extension");
    popupManager.addButtonToPopup("Delete Video", function(){
      if(typeof button != "undefined"){
        button.parentNode.parentNode.removeChild(button.parentNode);
      }
      playlistCollectionManager.deleteVideoFromPlaying(message.video.uid);
    });
  }
  else if(message.request == "error_popup"){
    popupManager.createErrorPopup(message.error);
  }
  else if(message.request == "network_status"){
    // If online
    if(message.status){
      document.getElementById("no-internet-error-display").style.display = "none";
    }
    else{
      document.getElementById("no-internet-error-display").style.display = "block";
    }
  }
});

function setPlayingPlaylist(){
  playlistPageManager.setPlayingPlaylist(playlistCollectionManager.getViewingPlaylist());
  playlistCollectionManager.setPlayingPlaylistUid(playlistCollectionManager.getViewingPlaylistUid());
}

window.addEventListener("load", onload, false);