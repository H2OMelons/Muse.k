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
  var totalVideosRemoved = 0;
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
      this.processRawPlaylist(playlistList[i], function(numRemoved){
        totalVideosRemoved += numRemoved;
        numProcessedPlaylists++;
        if(numProcessedPlaylists == totalPlaylists){
          callback(totalVideosRemoved);
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
    playlistGenerator.processRawVideoList(videoResults, playlist.snippet.title, function(numRemoved){
      callback(numRemoved);
    });
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
      if(typeof video != "undefined" && video.status.embeddable){
        videos.push(video);
      }
      numCompleted++;
      if(numCompleted == videoResults.length){
        playlistGenerator.generateNewPlaylist(videos, title, undefined, function(){
          callback(numCompleted - videos.length);
        });
      }
    });
  }
}

PlaylistGenerator.prototype.addRawVideosToPlaylist = function(videoResults, title, playlistUid, callback){
  var videos = [];
  var numCompleted = 0;
  var i;
  for(i = 0; i < videoResults.length; i++){
    chrome.extension.getBackgroundPage().createVideo(videoResults[i].snippet.resourceId.videoId, function(video){
      if(typeof video != "undefined"){
        videos.push(video);
      }
      numCompleted++;
      if(numCompleted == videoResults.length){
        if(typeof playlistUid == "undefined"){
          playlistGenerator.generateNewPlaylist(videos, title, undefined, callback);
        }
        else{
          playlistGenerator.addVideosToPlaylist(videos, playlistUid, function(){
            callback(videos);
          });
        }
      }
    });
  }
}

PlaylistGenerator.prototype.idToRawVideoListAdapter = function(ids){
  var videoResults = [];
  var i;
  for(i = 0; i < ids.length; i++){
    var obj = {
      snippet: {
        resourceId: {
          videoId: ids[i]
        }
      }
    }
    videoResults.push(obj);
  }
  return videoResults;
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

PlaylistGenerator.prototype.addVideosToPlaylist = function(videos, playlistUid, callback){
  var playlist = playlistCollectionManager.getPlaylist(playlistUid);
  var i;
  for(i = 0; i < videos.length; i++){
    if(typeof videos[i].uid == "undefined"){
      videos[i].uid = playlist.videoUidGenerator;
      playlist.videoUidGenerator++;
    }
  }
  playlist.videos = playlist.videos.concat(videos);
  playlistCollectionManager.editPlaylist(playlist);
  callback();
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
  }
  
  var settings = document.createElement("div");
  settings.classList.add("playlist-settings", "card-background");
  var deleteContainer = document.createElement("div");
  deleteContainer.classList.add("playlist-delete", "float-left", "button");
  var deleteButtonImg = document.createElement("div");
  deleteButtonImg.tag = "i";
  deleteButtonImg.classList.add("fa", "fa-trash-o", "large-font", "turquoise-hover");
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
  editContainer.classList.add("playlist-edit", "float-left", "button", "large-font", "turquoise-hover");
  var editButtonImg = document.createElement("div");
  editButtonImg.tag = "i";
  editButtonImg.classList.add("fa", "fa-pencil-square-o");
  editButtonImg.setAttribute("aria-hidden", "true");
  editContainer.appendChild(editButtonImg);
  
  var playContainer = document.createElement("div");
  playContainer.classList.add("playlist-play", "white");
  var playImg = document.createElement("i");
  playImg.classList.add("fa", "fa-volume-up");
  playImg.setAttribute("aria-hidden", "true");
  playContainer.appendChild(playImg);
  
  
  settings.appendChild(editContainer);
  settings.appendChild(deleteContainer);
  
  editContainer.onclick = function(e){
    if(titleContainer.disabled == ""){
      var playlist = playlistCollectionManager.getPlaylist(playlistObj.uid);
      if(titleContainer.value != playlist.name){
        playlist.name = titleContainer.value;
        playlistCollectionManager.editPlaylist(playlist);
        tag = "Playlist " + playlistObj.uid + ":" + titleContainer.value;
        div.id = tag;
        if(playlistCollectionManager.getViewingPlaylistUid() == playlistObj.uid){
          document.getElementById("playlist-name").value = titleContainer.value;
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
  div.appendChild(playContainer);
  div.appendChild(settings);
  
  document.getElementById("playlist-list").appendChild(div);
  
  if(callback){
    callback();
  }
}