"use strict";

function ResetCommand(doc) {
  this.doc = doc;
}

ResetCommand.prototype = {
  exec: function () {
    this.placement = this.doc.placement;
    this.doc.placement = [];
    this.doc.updateToolbox();
  },

  undo: function () {
    this.doc.placement = this.placement;
    this.doc.updateToolbox();
  }
};
