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