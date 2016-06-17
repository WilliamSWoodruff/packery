/**
 * Packery Item Element
**/

/* jshint devel: true*/

( function( window, factory ) {
  'use strict';
  // universal module definition

  if ( typeof define == 'function' && define.amd ) {
    // AMD
    define( [
        'get-style-property/get-style-property',
        'outlayer/outlayer',
        './rect'
      ],
      factory );
  } else if ( typeof exports == 'object' ) {
    // CommonJS
    module.exports = factory(
      require('desandro-get-style-property'),
      require('outlayer'),
      require('./rect')
    );
  } else {
    // browser global
    window.Packery.Item = factory(
      window.getStyleProperty,
      window.Outlayer,
      window.Packery.Rect
    );
  }

}( window, function factory( getStyleProperty, Outlayer, Rect ) {
'use strict';

// -------------------------- Item -------------------------- //

var transformProperty = getStyleProperty('transform');

// sub-class Item
var Item = function PackeryItem() {
  Outlayer.Item.apply( this, arguments );
};

Item.prototype = new Outlayer.Item();

var protoCreate = Item.prototype._create;
Item.prototype._create = function() {
  // call default _create logic
  protoCreate.call( this );
  this.rect = new Rect();
  // this.rect.enablePlacement = true;
  // rect used for placing, in drag or Packery.fit()
  this.placeRect = new Rect();
  this.dragOffsetCounter = 0;
};

// -------------------------- drag -------------------------- //

Item.prototype.dragStart = function(packery) {
  packery.disableLayout = true;
  this.getPosition();
  this.removeTransitionStyles();
  // remove transform property from transition
  if ( this.isTransitioning && transformProperty ) {
    this.element.style[ transformProperty ] = 'none';
  }
  this.getSize();
  // create place rect, used for position when dragged then dropped
  // or when positioning
  this.isPlacing = true;
  this.needsPositioning = false;
  this.positionPlaceRect( this.position.x, this.position.y );
  this.isTransitioning = false;
  this.didDrag = false;
  
  this.dragOffsetCounter = 0;
};

/**
 * handle item when it is dragged
 * @param {Number} x - horizontal position of dragged item
 * @param {Number} y - vertical position of dragged item
 */

Item.prototype.dragMove = function( packery, moveVector, x, y ) {
  
  if( packery.options.tileMode ) {
    // console.log("TILE MODE!!!");
    //////////////
    
    if(packery.options.tileMode === true) {
      this.dragOffsetCounter += 1;
      if(this.dragOffsetCounter !== 5) {
        return;
      } else {
        this.dragOffsetCounter = 0;
      }
    }
    
    // if(this.calculatingDrag === true) {
    //   console.log("STILL CALCING DRAG");
    //   return;
    // }
    
    // this.calculatingDrag = true;
    
    ///////////////////
    
    var origPlaceRect = {};
    origPlaceRect.x = this.placeRect.x;
    origPlaceRect.y = this.placeRect.y;
    
    var thisCenter = {};
    
    thisCenter.x = (this.rect.x + (this.rect.width/2)) + moveVector.x;
    thisCenter.y = (this.rect.y + (this.rect.height/2)) + moveVector.y;
    
    var tiles = packery.items;
    
    var numTiles = tiles.length;
    
    // var self = this;
    
    for(var i=0; i<numTiles; i++) {
      if(tiles[i].element.id === this.element.id) {
        continue;
      }
      
      var tileCenter = {};
      tileCenter.x = (tiles[i].rect.x + (tiles[i].rect.width/2));
      tileCenter.y = (tiles[i].rect.y + (tiles[i].rect.height/2));
      
      if(this.distanceBetweenItems(thisCenter, tileCenter) < 130) {
        
        if(tiles[i] == this.switchingWith) {
          return;
        }
        
        this.didDrag = true;
        console.log("SWITCH WITH " + tiles[i].element.id);
        if(tiles[i].element.tileMode === 'large') {
          
          if(this.element.tileMode === 'small') {
            this.element.transitionToCardMode('large-tile-view');
            tiles[i].element.transitionToCardMode('small-tile-view');
          }
          
        } else {
          if(this.element.tileMode === 'large') {
            this.element.transitionToCardMode('small-tile-view');
            tiles[i].element.transitionToCardMode('large-tile-view');
          }
        }
        
        this.placeRect.x = tiles[i].rect.x;
        this.placeRect.y =  tiles[i].rect.y;
        
        tiles[i].placeRect.x = origPlaceRect.x;
        tiles[i].placeRect.y = origPlaceRect.y;
        
        this.switchingWith = tiles[i];
        
        // tiles[i].copyPlaceRectPosition();
        
        // Whitelist placement ability for tiles view
        
        // this.rect.enablePlacement = true;
        // tiles[i].rect.enablePlacement = true;
        // this.calculatingDrag = false;
        // console.log(this.calculatingDrag);
        // packery.layout();
        ////////////////
        // tiles[i].positionPlaceRect(this.rect.x, this.rect.y);
        // this.positionPlaceRect(tiles[i].rect.x, tiles[i].rect.y);
        
        console.log(origPlaceRect);
        this.switchingWith.moveTo(origPlaceRect.x, origPlaceRect.y);
        this.switchingWith.copyPlaceRectPosition();
        break;
      }
    }
    
    if(this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
    
    var self = this;
    this.transitionTimeout = setTimeout(function() {
      console.warn("RELEAST IS!");
      self.switchingWith = null;
    }, 500);
    
  } else {
    this.didDrag = true;
    var packerySize = this.layout.size;
    x -= packerySize.paddingLeft;
    y -= packerySize.paddingTop;
    
    this.positionPlaceRect( x, y );
  }
};

Item.prototype.distanceBetweenItems = function(pos1, pos2) {
  return Math.round(Math.sqrt( (pos1.x-pos2.x)*(pos1.x-pos2.x) + (pos1.y-pos2.y)*(pos1.y-pos2.y) ));
};

Item.prototype.dragStop = function(packery) {
  packery.disableLayout = false;
  this.getPosition();
  var isDiffX = this.position.x != this.placeRect.x;
  var isDiffY = this.position.y != this.placeRect.y;
  // set post-drag positioning flag
  this.needsPositioning = isDiffX || isDiffY;
  // reset flag
  this.didDrag = false;
};

// -------------------------- placing -------------------------- //

/**
 * position a rect that will occupy space in the packer
 * @param {Number} x
 * @param {Number} y
 * @param {Boolean} isMaxContained
 */
Item.prototype.positionPlaceRect = function( x, y, isMaxOpen ) {
  this.placeRect.x = this.getPlaceRectCoord( x, true, isMaxOpen );
  this.placeRect.y = this.getPlaceRectCoord( y, false, isMaxOpen );
};

/**
 * get x/y coordinate for place rect
 * @param {Number} coord - x or y
 * @param {Boolean} isX
 * @param {Boolean} isMaxOpen - does not limit value to outer bound
 * @returns {Number} coord - processed x or y
 */
Item.prototype.getPlaceRectCoord = function( coord, isX, isMaxOpen ) {
  var measure = isX ? 'Width' : 'Height';
  var size = this.size[ 'outer' + measure ];
  // console.log(size);
  var segment = this.layout[ isX ? 'columnWidth' : 'rowHeight' ];
  var parentSize = this.layout.size[ 'inner' + measure ];
  
  // additional parentSize calculations for Y
  if ( !isX ) {
    parentSize = Math.max( parentSize, this.layout.maxY );
    // prevent gutter from bumping up height when non-vertical grid
    if ( !this.layout.rowHeight ) {
      parentSize -= this.layout.gutter;
    }
  }

  var max;

  if ( segment ) {
    segment += this.layout.gutter;
    // allow for last column to reach the edge
    parentSize += isX ? this.layout.gutter : 0;
    // snap to closest segment
    coord = Math.round( coord / segment );
    // contain to outer bound
    // contain non-growing bound, allow growing bound to grow
    var mathMethod;
    if ( this.layout.options.isHorizontal ) {
      mathMethod = !isX ? 'floor' : 'ceil';
    } else {
      mathMethod = isX ? 'floor' : 'ceil';
    }
    var maxSegments = Math[ mathMethod ]( parentSize / segment );
    maxSegments -= Math.ceil( size / segment );
    max = maxSegments;
  } else {
    max = parentSize - size;
  }

  coord = isMaxOpen ? coord : Math.min( coord, max );
  coord *= segment || 1;

  return Math.max( 0, coord );
};

Item.prototype.copyPlaceRectPosition = function() {
  this.rect.x = this.placeRect.x;
  this.rect.y = this.placeRect.y;
};

// -----  ----- //

// remove element from DOM
Item.prototype.removeElem = function() {
  this.element.parentNode.removeChild( this.element );
  // add space back to packer
  this.layout.packer.addSpace( this.rect );
  this.emitEvent( 'remove', [ this ] );
};

// -----  ----- //

return Item;

}));
