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