function PlaylistCollectionManager(playlistCollection){
  this.playlistManagers = new Map();
  this.createPlaylistCollection(playlistCollection);
  this.editingPlaylistUid = undefined;
  this.playingPlaylistUid = undefined;  
  this.viewingPlaylistUid = undefined;
}

PlaylistCollectionManager.prototype.setEditingPlaylistUid = function(uid){
  this.editingPlaylistUid = uid;
}

PlaylistCollectionManager.prototype.getEditingPlaylistUid = function(){
  return this.editingPlaylistUid;
}

PlaylistCollectionManager.prototype.getEditingPlaylist = function(){
  return this.getPlaylist(this.getEditingPlaylistUid());
}

PlaylistCollectionManager.prototype.setPlayingPlaylistUid = function(uid){
  this.playingPlaylistUid = uid;
}

PlaylistCollectionManager.prototype.getPlayingPlaylistUid = function(){
  return this.playingPlaylistUid;
}

PlaylistCollectionManager.prototype.getPlayingPlaylist = function(){
  return this.getPlaylist(this.getPlayingPlaylistUid());
}

PlaylistCollectionManager.prototype.getPlayingManager = function(){
  return this.playlistManagers.get(this.getPlayingPlaylistUid());
}

PlaylistCollectionManager.prototype.setViewingPlaylistUid = function(uid){
  this.viewingPlaylistUid = uid;
}

PlaylistCollectionManager.prototype.getViewingPlaylistUid = function(uid){
  return this.viewingPlaylistUid;
}

PlaylistCollectionManager.prototype.getViewingPlaylist = function(){
  return this.getPlaylist(this.getViewingPlaylistUid());
}

PlaylistCollectionManager.prototype.getViewingManager = function(){
  return this.playlistManagers.get(this.getViewingPlaylistUid());
}

PlaylistCollectionManager.prototype.createPlaylistCollection = function(playlistCollection){
  var tempThis = this;
  playlistCollection.forEach(function(value, key){
    tempThis.playlistManagers.set(key, new PlaylistManager(value));
  });
}

PlaylistCollectionManager.prototype.editPlaylist = function(playlist){
  this.playlistManagers.get(playlist.uid).editPlaylist(playlist);
}

PlaylistCollectionManager.prototype.editViewingPlaylist = function(name){
  var playlist = this.getViewingPlaylist();
  if(playlist.name != name){
    playlist.name = name;
    this.playlistManagers.get(playlist.uid).editPlaylist(playlist);
  }
}

PlaylistCollectionManager.prototype.deletePlaylist = function(){
  this.deletePlaylistByUid(this.editingPlaylistUid);
}

PlaylistCollectionManager.prototype.deletePlaylistByUid = function(uid){
  if(this.viewingPlaylistUid == this.editingPlaylistUid){
    this.viewingPlaylistUid = undefined;
  }
  if(this.editingPlaylistUid == this.playingPlaylistUid){
    this.playingPlaylistUid = undefined;
  }
  this.editingPlaylistUid = undefined;
  this.playlistManagers.delete(uid);
  var playlistUids = Array.from(this.playlistManagers.keys());
  chrome.storage.local.remove(uid, function(){
      if(chrome.runtime.lastError){
        console.warn(chrome.runtime.lastError.message);
      }
    });
    
    // Update the list of uids in local storage
    chrome.storage.local.set({playlistUids:playlistUids}, function(){
      if(chrome.runtime.lastError){
        console.warn(chrome.runtime.lastError.message);
      }
    });
}

PlaylistCollectionManager.prototype.insertPlaylist = function(playlist){
  this.playlistManagers.set(playlist.uid, new PlaylistManager(playlist));
  var playlistUids = Array.from(this.playlistManagers.keys());
  chrome.storage.local.set({playlistUids: playlistUids}, function(){
    if(chrome.runtime.lastError){
      console.warn(chrome.runtime.lastError.message);   
    }
  });
  var obj = {};
  obj[playlist.uid] = playlist;
  chrome.storage.local.set(obj, function(){
    if(chrome.runtime.lastError){
      console.warn(chrome.runtime.lastError.message);
    }
  });
}

PlaylistCollectionManager.prototype.editVideo = function(video){
  this.playlistManagers.get(this.getViewingPlaylistUid()).editVideo(video);
}

PlaylistCollectionManager.prototype.deleteVideo = function(videoUid){
  if(this.getViewingPlaylistUid() == this.getPlayingPlaylistUid()){
    videoPlayerManager.removeFromQueue(videoUid);
  }
  this.playlistManagers.get(this.getViewingPlaylistUid()).deleteVideo(videoUid);
}

PlaylistCollectionManager.prototype.deleteVideoFromPlaying = function(videoUid){
  videoPlayerManager.removeFromQueue(videoUid);
  this.playlistManagers.get(this.getPlayingPlaylistUid()).deleteVideo(videoUid);
}

PlaylistCollectionManager.prototype.insertVideo = function(playlistUid, videoId){
  if(typeof playlistUid == "number"){
    playlistUid = playlistUid.toString();
  }
  var tempThis = this;
  createVideo(videoId, function(videoInfo){
    if(typeof videoInfo.uid == "undefined"){
      videoInfo.uid = playlistCollectionManager.getPlaylist(playlistUid).videoUidGenerator;
      playlistCollectionManager.getPlaylist(playlistUid).videoUidGenerator++;
    }
    if(playlistUid == tempThis.getPlayingPlaylistUid()){
      videoPlayerManager.addToQueue(videoInfo);
    }
    tempThis.playlistManagers.get(playlistUid).insertVideo(videoInfo);
  });
}

PlaylistCollectionManager.prototype.getPlaylist = function(uid){
  return this.playlistManagers.get(uid).getPlaylist();
}

PlaylistCollectionManager.prototype.getPlaylistLength = function(uid){
  return this.getPlaylist(uid).videos.length;
}

PlaylistCollectionManager.prototype.getPlaylistCollection = function(){
  var temp = [];
  this.playlistManagers.forEach(function(value, key){
    temp.push(value.playlist);  
  });
  return temp;
}

PlaylistCollectionManager.prototype.getPlaylistCollectionLength = function(){
  return this.getPlaylistCollection().length;
}

PlaylistCollectionManager.prototype.size = function(){
  return this.playlistManagers.size;
}

function PlaylistManager(playlist){
  this.playlist = playlist;
}

PlaylistManager.prototype.editPlaylist = function(editedPlaylist){
  if(this.playlist.uid != editedPlaylist.uid){
    console.error("Playlist edit has different uids");
  }
  this.playlist = editedPlaylist;
  chrome.storage.local.remove(editedPlaylist.uid, function(){
    if(chrome.runtime.lastError){
      console.warn(chrome.runtime.lastError.message);
    }
    
    var obj = {};
    obj[editedPlaylist.uid] = editedPlaylist;
    chrome.storage.local.set(obj, function(){
      if(chrome.runtime.lastError){
        console.warn(chrome.runtime.lastError.message);
      }
    });
  });
}

PlaylistManager.prototype.getPlaylist = function(){
  return this.playlist;
}

PlaylistManager.prototype.editVideo = function(video){
  var i;
  for(i = 0; i < this.playlist.videos.length; i++){
    if(this.playlist.videos[i].uid == video.uid){
      this.playlist.videos[i] = video;
      playlistCollectionManager.editPlaylist(this.playlist);
      i = this.playlist.videos.length;
    }
  }
}

PlaylistManager.prototype.insertVideo = function(video){  
  this.playlist.videos.push(video);
  this.editPlaylist(this.playlist);
  var videoIndex = this.playlist.videos.length - 1;
  if(this.playlist.uid == playlistCollectionManager.getViewingPlaylistUid()){
    chrome.runtime.sendMessage({request: "createVideoDiv", video: video});
  }
}

PlaylistManager.prototype.deleteVideo = function(videoUid){
  var i;
  for(i = 0; i < this.playlist.videos.length; i++){
    if(this.playlist.videos[i].uid == videoUid){
      this.playlist.videos.splice(i, 1);
      playlistCollectionManager.editPlaylist(this.playlist);
      i = this.playlist.videos.length;
    }
  }
}



