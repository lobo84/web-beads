var MAX_HEIGHT = 500;

function closestColor(c, palette) {
    var result = new Uint8ClampedArray(3);    
    var r = c[0];
    var g = c[1];
    var b = c[2];
    var closest = Number.MAX_VALUE;
    for (var i = 0; i < palette.length; i+=3) {
	var rp = palette[i];
	var gp = palette[i+1];
	var bp = palette[i+2];
	var sq = Math.pow(r - rp, 2) + Math.pow(g - gp, 2) + Math.pow(b - bp, 2);
	if (sq < closest) {
	    closest = sq;
	    result[0] = rp;
	    result[1] = gp;
	    result[2] = bp;	    
	}
    }
    return result;
}

function colorReduce(data, width, height, palette) {
    for (var y = 0; y < height*3; y++) {
	for (var x = 0; x < width*3; x++) {
	    var idx = (y * width + x)*3;
	    closest = closestColor(data.slice(idx,idx+3), palette);
	    data[idx] = closest[0];
	    data[idx+1] = closest[1];
	    data[idx+2] = closest[2];	    
	}
    }
}

function getBeadHeight(beadWidth) {
    return Math.floor(beadWidth * (height/width));
}

function toBeads(data, width, height, beadWidth) {
    const beadHeight = getBeadHeight(beadWidth);
    const beadWidthBytes = beadWidth * 3;
    const pixelsInBeadWidth = Math.floor(width / beadWidth);
    const pixelsInBeadHeight = Math.floor(height / beadHeight);
    const pixelsInBeadWidthBytes = pixelsInBeadWidth * 4;
    const countInv = 1.0/(pixelsInBeadHeight*pixelsInBeadWidth);
    const accSize = beadWidth*3;
    const acc = new Uint32Array(accSize);
    const widthBytes = width * 4;
    var result = new Uint8ClampedArray(beadWidth * beadHeight * 3);
    for (var by = 0; by < beadHeight; by++) {
	var byImgOffset = by * pixelsInBeadHeight * widthBytes;
	for (var y = 0; y < pixelsInBeadHeight; y++) {
	    var yImgOffset = y * widthBytes;
	    var offset = byImgOffset + yImgOffset;
	    for (var bx = 0; bx < beadWidth; bx++) {
		var bxImg = offset + bx * pixelsInBeadWidthBytes;
		var accIdxRed = bx * 3;
		var accIdxGreen = accIdxRed + 1;
		var accIdxBlue = accIdxRed + 2;		
		for (var x = 0; x < pixelsInBeadWidthBytes; x+=4) {
		    var dataIdx = bxImg + x;
		    acc[accIdxRed] += data[dataIdx];
		    acc[accIdxGreen] += data[dataIdx + 1];
		    acc[accIdxBlue] += data[dataIdx + 2];		    
		}
	    }
	}
	var offset = by * beadWidthBytes;
	for (var bx = 0; bx < accSize; bx+=3) {
	    var rp = offset + bx;
	    var bx1 = bx + 1;
	    var bx2 = bx + 2;	    
	    result[rp] = Math.round(acc[bx] * countInv);
	    result[rp+1] = Math.round(acc[bx1] * countInv);
	    result[rp+2] = Math.round(acc[bx2] * countInv);
	    acc[bx] = 0;
	    acc[bx1] = 0;
	    acc[bx2] = 0;	    
	}
    }
    return {width: beadWidth,
	    height: beadHeight,
	    data: result};
}

var pixelsData = null;
var ctx = null;
var canvas = null;
var width = 0;
var height = 0;
var mBeadWidth = 10;
var mBeadWidthSize = 10;
var mBeads = null;
var mPosX = 0;
var mPosY = 0;
var mUpdateBeads = true;


function render(src){
    var img = new Image();
    img.onload = function(){
	tempCanvas = document.createElement('canvas');
	tempCanvas.width = img.width;
	tempCanvas.height = img.height;
	tempCanvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height);	
	width = img.width;
	height = img.height;
	var pixels = tempCanvas.getContext('2d').getImageData(0, 0, img.width, img.height);
	pixelsData = pixels.data;
	renderBeads(mPosX, mPosY);
    };
    img.src = src;
}

function paletteToTyped(palette) {
    r = new Uint8ClampedArray(palette.size * 3);
    var i = 0;
    palette.forEach(function(value) {
	rgb = rgbStrToColor(value);
	r[i] = rgb.r;
	r[i+1] = rgb.g;
	r[i+2] = rgb.b;	
	i+=3;
    });
    return r;
}

function renderBeads(x, y) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);    
    var palette = paletteToTyped(mPalette);
    if (mUpdateBeads) {
	mUpdateBeads = false;
	mBeads = toBeads(pixelsData, width, height, mBeadWidth);
	const beadHeight = getBeadHeight(mBeadWidth);
	colorReduce(mBeads.data, mBeadWidth, beadHeight, palette);	
    }
    var halfBeadWidthSize = mBeadWidthSize/2;
    var twoPi = 2*Math.PI;
    var xOffset = mPosX + halfBeadWidthSize;
    var yOffset = mPosY + halfBeadWidthSize;    
    for (var y = 0; y < mBeads.height; y++) {
	for (var x = 0; x < mBeads.width; x++) {
	    var p = (y * mBeads.width + x)*3
            ctx.beginPath();
            ctx.fillStyle = 'rgba(' + mBeads.data[p] + ',' + mBeads.data[p+1] + ',' + mBeads.data[p+2] + ",255)";
            ctx.arc(xOffset + x*mBeadWidthSize,
		    yOffset + y*mBeadWidthSize, halfBeadWidthSize,0, twoPi, true);
            ctx.closePath();
            ctx.fill(); 
        }
    }	
}

function loadImage(src){
    //	Prevent any non-image file type from being read.
    if(!src.type.match(/image.*/)){
	console.log("The dropped file is not an image: ", src.type);
	return;
    }
    
    //	Create our FileReader and run the results through the render function.
    var reader = new FileReader();
    reader.onload = function(e){
	render(e.target.result);
    };
    reader.readAsDataURL(src);
}

mPalette = new Set();

function rgbStrToColor(s) {
    rgb = s.split(',');
    return {r: parseInt(rgb[0]), g: parseInt(rgb[1]), b: parseInt(rgb[2])}
}
function cssToRgbStr(elem, cssAttr) {
    var bg = elem.css(cssAttr);
    var start = bg.indexOf("(");
    var stop = bg.indexOf(")");    
    var rgb = bg.substring(start+1,stop).replace(/\s/g, '');
    return rgb;
}

var zoomPosState = {
    move: false,
    startMoveX: 0,
    startMoveY: 0,
    beadsPosAtStartX: 0,
    beadsPosAtStartX: 0    
};

$(function() {
    $("#range").ionRangeSlider({
        min: 10,
        max: 100,
	step: 1,
	onChange: function (data) {
	    mBeadWidth = data.from;
	    mUpdateBeads = true;
	    renderBeads(mPosX, mPosY);
	}	   
    });
    $("#rangeBeadWidth").ionRangeSlider({
        min: 2,
        max: 100,
	step: 1,
	onChange: function (data) {
	    mBeadWidthSize = data.from;
	    renderBeads(mPosX, mPosY);
	}	   
    });
    
    $( ".color-box" ).click(function(e) {
	colorBox = $(e.target);
	if (colorBox.css('border-style') == 'none') {
	    colorBox.css('border-style','solid');
	    mPalette.add(cssToRgbStr(colorBox, 'background'));
	}
	else {
	    mPalette.delete(cssToRgbStr(colorBox, 'background'));
	    colorBox.css('border-style','none');
	}
	if (pixelsData != null) {
	    mUpdateBeads = true;	    
	    renderBeads(mPosX, mPosY);
	}
    });

    
    canvas = document.getElementById("canvas");
    canvas.width = 1000;
    canvas.height = 800;

    canvas.addEventListener('mousewheel',function(event){
	var rect = canvas.getBoundingClientRect();
	var x = event.clientX - rect.left;
	var y = event.clientY - rect.top;
	var beadCoordX = x - mPosX;
	var beadCoordY = y - mPosY;

	var relativeX = beadCoordX / (mBeadWidth * mBeadWidthSize);
	var relativeY = beadCoordY / (getBeadHeight(mBeadWidth) * mBeadWidthSize);

	var inc = Math.round(event.deltaY*0.1);
	var oldWidth = (mBeadWidth * mBeadWidthSize);
	var oldHeight = (getBeadHeight(mBeadWidth) * mBeadWidthSize);
	mBeadWidthSize = Math.max(mBeadWidthSize - inc,1);
	var newWidth = (mBeadWidth * mBeadWidthSize);
	var newHeight = (getBeadHeight(mBeadWidth) * mBeadWidthSize);

	var increaseX = relativeX * ((oldWidth - newWidth)/2.0)
	var decreaseX = (1.0 - relativeX) * ((oldWidth - newWidth)/2.0)

	mPosX += (relativeX) * (oldWidth - newWidth);
	mPosY += (relativeY) * (oldHeight - newHeight);	
	renderBeads(mPosX,mPosY);
	event.preventDefault();	
	return true; 
    }, false);
    
    canvas.addEventListener('mousemove', function(event){
	if (zoomPosState.move) {
	    var rect = canvas.getBoundingClientRect();
	    var x = event.clientX - rect.left;
	    var y = event.clientY - rect.top;
	    var dx = x - zoomPosState.startMoveX;
	    var dy = y - zoomPosState.startMoveY;	    
	    mPosX = zoomPosState.beadsPosAtStartX + dx;
	    mPosY = zoomPosState.beadsPosAtStartY + dy;
	    renderBeads(mPosX,mPosY);

	}
    });
    
    canvas.addEventListener('selectstart', function(e) { e.preventDefault(); return false; }, false);    
    canvas.addEventListener('mouseup', function(event){
	zoomPosState.move = false;
    });
    canvas.addEventListener('mousedown', function(event){
	var rect = canvas.getBoundingClientRect();
	zoomPosState.move = true;
	zoomPosState.startMoveX = event.clientX - rect.left;
	zoomPosState.startMoveY = event.clientY - rect.top;
	zoomPosState.beadsPosAtStartX = mPosX;
	zoomPosState.beadsPosAtStartY = mPosY;	
    });
    
    ctx = canvas.getContext("2d");

    var target = document.getElementById("drop-target");
    target.addEventListener("dragover", function(e){e.preventDefault();}, true);
    target.addEventListener("drop", function(e){
	e.preventDefault(); 
	loadImage(e.dataTransfer.files[0]);
	document.getElementById("drop-target").style.display = "none"
    }, true);
});
