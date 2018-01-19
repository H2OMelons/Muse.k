function VideoPlayer(player){
  this.player = player;
  this.userPause = false;
  this.stopped = false;
}

VideoPlayer.prototype.SYNC = 0;
VideoPlayer.prototype.SEEK = 1;

VideoPlayer.prototype.loadVideo = function(video){
  if(typeof video.startTime == "undefined" || typeof video.endTime == "undefined"){
    this.player.loadVideoById(video.videoId, 0, "small");
  }
  else{
    this.player.loadVideoById({"videoId": video.videoId,
                          "startSeconds": video.startTime,
                          "endSeconds": video.endTime,
                          "suggestedQuality": "small"});  
  }
}

VideoPlayer.prototype.cueVideo = function(video){
  var startTime = 0;
  var endTime = 0;
  if(typeof video.startTime == "undefined" && typeof video.endTime == "undefined"){
    this.player.cueVideoById(video.videoId, 0, "small");
    var start = video.duration.indexOf("PT") + 2;
    var end = video.duration.indexOf("M");
    var min = parseInt(video.duration.slice(start, end));
    var sec = parseInt(video.duration.slice(end + 1, video.duration.indexOf("S")));
    endTime = min * 60 + sec;
  }
  else if(typeof video.startTime == "undefined"){
    this.player.cueVideoById({"videoId": video.videoId,
                              "startSeconds": 0,
                              "endSeconds": video.endTime,
                              "suggestedQuality": "small"
      
    });
    endTime = video.endTime;
  }
  else if(typeof video.endTime == "undefined"){
    this.player.cueVideoById(video.videoId, video.startTime, "small");
    var start = video.duration.indexOf("PT") + 2;
    var end = video.duration.indexOf("M");
    var min = parseInt(video.duration.slice(start, end));
    var sec = parseInt(video.duration.slice(end + 1, video.duration.indexOf("S")));
    startTime = video.starTime;
    endTime = min * 60 + sec;
  }
  else{
    this.player.cueVideoById({"videoId": video.videoId,
                              "startSeconds": video.startTime,
                              "endSeconds": video.endTime,
                              "suggestedQuality": "small"
    });
    startTime = video.startTime;
    endTime = video.endTime
  }
  chrome.runtime.sendMessage({request: "initTimeBar", startTime: startTime, endTime: endTime});
}

VideoPlayer.prototype.getPlayerState = function(){
  return this.player.getPlayerState();
}

VideoPlayer.prototype.play = function(){
  this.stopped = false;
  this.player.playVideo();
}

VideoPlayer.prototype.pause = function(){
  this.player.pauseVideo();
}

VideoPlayer.prototype.stop = function(){
  this.stopped = true;
  this.player.stopVideo();
}

VideoPlayer.prototype.seekTo = function(time){
  this.player.seekTo(time);
}

VideoPlayer.prototype.getCurrentTime = function(){
  return this.player.getCurrentTime();
}

VideoPlayer.prototype.getDuration = function(){
  return this.player.getDuration();
}

VideoPlayer.prototype.getVideoUrl = function(){
  return this.player.getVideoUrl();
}

VideoPlayer.prototype.setVolume = function(volume){
  this.player.setVolume(volume);
}

VideoPlayer.prototype.mute = function(){
  this.player.mute();
}