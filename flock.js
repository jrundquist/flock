window.onresize  = function(){
  if ( ctx ) {
    document.getElementById('canvas').width = window.innerWidth;
    document.getElementById('canvas').height = window.innerHeight;
  }
  document.getElementById('canvas').style.width = window.innerWidth+'px';
  document.getElementById('canvas').style.height = window.innerHeight+'px';

  voronoi = d3.geom.voronoi()
    .clipExtent([[0, 0], [window.innerWidth, window.innerHeight]])
    .x(function(d){
      return d.location.c1;
    })
    .y(function(d){
      return d.location.c2;
    });
}



var voronoi = d3.geom.voronoi()
    .clipExtent([[0, 0], [window.innerWidth, window.innerHeight]])
    .x(function(d){
      return d.location.c1;
    })
    .y(function(d){
      return d.location.c2;
    });

var voronoiPolygons = [];
var birds = [];


var Settings = {
  birdCount: 300,
  maxBirdVelocity: 2,
  repulseRadius: 15,
  followRadius: 30,
  attractRadius: 50,
  maxForce: 4,
  birdSize: 2,
  seperationWeight: 4,
  alignmentWeight: 2,
  cohesionWeight: 1,
  drawVel: true,
  overlay: 0.5,
  orig: 0
};


var gui = new dat.GUI();
gui.add(Settings, 'maxBirdVelocity', 0, 5);
gui.add(Settings, 'repulseRadius', 0, 100);
gui.add(Settings, 'followRadius', 0, 100);
gui.add(Settings, 'attractRadius', 0, 100);
gui.add(Settings, 'seperationWeight', 0, 5);
gui.add(Settings, 'alignmentWeight', 0, 5);
gui.add(Settings, 'cohesionWeight', 0, 5);
gui.add(Settings, 'maxForce', 0, 10);
gui.add(Settings, 'birdSize', 0, 5);
gui.add(Settings, 'drawVel', true);
gui.add(Settings, 'overlay', 0, 1);
gui.add(Settings, 'orig', 0, 1);

var Vector = function(c1, c2){
  this.c1 = c1;
  this.c2 = c2;
  return this;
}

Vector.prototype.add = function(otherVector){
  this.c1 += otherVector.c1;
  this.c2 += otherVector.c2;
  return this;
}


Vector.subtract = function(a, b){
  return new Vector(a.c1, a.c2).subtract(b);
}

Vector.prototype.subtract = function(otherVector){
  this.c1 -= otherVector.c1;
  this.c2 -= otherVector.c2;
  return this;
}

Vector.prototype.magnitude = function(){
  return Math.sqrt(Math.pow(this.c1, 2) + Math.pow(this.c2, 2));
}

Vector.prototype.normalize = function(){
  var sum = this.magnitude();
  this.c1 /= sum;
  this.c2 /= sum;
  return this;
}

Vector.prototype.multiply = function(mult){
  this.c1 *= mult;
  this.c2 *= mult;
  return this;
}

Vector.prototype.divide = function(div){
  this.c1 /= div;
  this.c2 /= div;
  return this;
}

Vector.prototype.limit = function(max){
  if ( this.magnitude() > max ){
    this.normalize();
    this.multiply(max);
  }
  return this;
}

Vector.prototype.wrap = function(boundsOne, boundsTwo){
  if ( this.c1 < boundsOne[0] ){
    this.c1 += boundsOne[1];
  } else if ( this.c1 > boundsOne[1] ){
    this.c1 -= boundsOne[1];
  }
  if ( this.c2 < boundsTwo[0] ){
    this.c2 += boundsTwo[1];
  } else if ( this.c2 > boundsTwo[1] ){
    this.c2 -= boundsTwo[1];
  }
  return this;
}

Vector.prototype.distance = function(other){
  return Math.sqrt(Math.pow(this.c1 - other.c1, 2) + Math.pow(this.c2 - other.c2, 2));
}


var Bird = function(){
  this.location = new Vector(Math.random() * window.innerWidth, Math.random() * window.innerHeight);
  this.velocity = new Vector(Math.random() * -Settings.maxBirdVelocity, Math.random() * Settings.maxBirdVelocity);
  return this;
}

Bird.prototype.update = function(){
  var neighbours = birds.filter((function(b){ return b !== this;}).bind(this)),
      acceleration = this.flock(neighbours);
  this.velocity.add(acceleration).limit(Settings.maxBirdVelocity);
  this.location.add(this.velocity).wrap([0, ctx.canvas.width], [0, ctx.canvas.height]);
}


Bird.prototype.flock = function(neighbours){
    var avoid = this.avoid(neighbours).multiply(Settings.seperationWeight),
        alignment = this.align(neighbours).multiply(Settings.alignmentWeight)
        cohesion = this.cohere(neighbours).multiply(Settings.cohesionWeight);
    return avoid.add(alignment).add(cohesion);
}

Bird.prototype.draw = function(ctx){
  var velocityScale = 10
  ctx.fillStyle = "#fa0";
  ctx.strokeStyle = "#0af";
  ctx.strokeWidth = "2";
  ctx.beginPath();
  ctx.arc(this.location.c1, this.location.c2, Settings.birdSize, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  if ( !Settings.drawVel ){
    return;
  }
  ctx.beginPath();
  ctx.moveTo(this.location.c1, this.location.c2);
  ctx.lineTo(this.location.c1 + this.velocity.c1 * velocityScale, this.location.c2 + this.velocity.c2 * velocityScale);
  ctx.stroke();
  ctx.closePath();
};


Bird.prototype.safeDistanceTo = function(other){
  var d = this.location.distance(other.location);//
  return Math.max(1e-2, d);
}



Bird.prototype.avoid = function(neighbours){
  var mean = new Vector(0,0),
      count = 0;
  for (i in neighbours){
    bird = neighbours[i];
    d = this.location.distance(bird.location);
    if ( d < Settings.repulseRadius ){
      mean.add(Vector.subtract(this.location,bird.location).normalize().divide(d));
      count++;
    }
  }
  count && mean.divide(count);
  mean.limit(Settings.maxForce);
  return mean;
};


Bird.prototype.cohere = function(neighbours){
  var sum = new Vector(0, 0),
      count = 0;
  for (i in neighbours){
    bird = neighbours[i];
    var d = this.location.distance(bird.location)
    if ( d < Settings.attractRadius  ){
      sum.add(bird.location);
      count++;
    }
  }
  if (count > 0){
      return this.steerTo(sum.divide(count));
  } else {
    return sum; // Empty vector contributes nothing
  }
};


Bird.prototype.align = function(neighbours){
  var mean = new Vector(0,0),
      count = 0;
  for (i in neighbours){
    bird = neighbours[i];
    d = this.location.distance(bird.location);
    if ( d < Settings.followRadius ){
      mean.add(bird.velocity);
      count++;
    }
  }
  count && mean.divide(count);
  mean.limit(Settings.maxForce);
  return mean;
};


Bird.prototype.steerTo = function(target){
  var d, desired, steer;

  desired = Vector.subtract(target, this.location);
  d = desired.magnitude();
  if (d > 0) {
    desired.normalize();
    if (d < 100.0) {
      desired.multiply(Settings.maxBirdVelocity * (d / 100.0));
    } else {
      desired.multiply(Settings.maxBirdVelocity);
    }
    steer = desired.subtract(this.velocity);
    steer.limit(Settings.maxForce);
  } else {
    steer = new Vector(0, 0);
  }

  return steer;
}


// Bird.prototype.interactWithMaybe = function(other){
//   var d = this.safeDistanceTo(other);
//   if ( d < Settings.attractRadius && d >= Settings.followRadius ){

//     this.cohereTo(other);
//     // other.cohereTo(this);
//     // var td = (other.t - this.t) / 10,
//     //     mult = (this.t < other.t)?1:-1;
//     // this.t += td * mult;
//     // other.t -= td * mult;
//   } else if ( d < Settings.followRadius && d >= Settings.repulseRadius ){
//     this.alignWith(other);
//     other.alignWith(this);
//     // var vd = (other.v - this.v) / 10,
//     //     mult = (this.v < other.v)?1:-1;
//     // this.v += vd * mult;
//     // other.v -= vd * mult;
//   } else if ( d < Settings.repulseRadius){
//     this.avoid(other);
//     other.avoid(this);
//     // this.v = this.v - this.v / 2;
//   }
//   this.update();
// }




var init = function(){
  document.getElementById('canvas').width = window.innerWidth;
  document.getElementById('canvas').height = window.innerHeight;
  window.ctx = document.getElementById('canvas').getContext('2d')
  for(var i=0; i<Settings.birdCount; i++){
    birds.push(new Bird());
  }
  window.requestAnimationFrame(draw);
}



var update = function(){
  //no-op for now;
  birds.map(function(bird, i){
    bird.update();
    // birds.map(function(birdTwo, j){
    //   if ( birdTwo !== birdOne && i < j ){
    //     birdOne.interactWithMaybe(birdTwo);
    //   }
    // });
  });

  voronoiPolygons = voronoi(birds);
}


var sampleImageAt = function(position){

  var rawX = Math.round(position.c1),
      rawY = Math.round(position.c2),
      adjustedX = Math.round((rawX / window.innerWidth) * backgroundImageData.width),
      adjustedY = Math.round((rawY / window.innerHeight) * backgroundImageData.height),
      target = ((backgroundImageData.width * adjustedY) + adjustedX) * 4,
      red = green = blue = count = 0,
      windowSize = 5;

  for ( var x=Math.max(0, adjustedX-windowSize), maxX=Math.min(backgroundImageData.height, adjustedX+windowSize); x<maxX; x++){
    for ( var y=Math.max(0, adjustedY-windowSize), maxY=Math.min(backgroundImageData.width, adjustedY+windowSize); y<maxY; y++){
      index = ((backgroundImageData.width * adjustedY) + adjustedX) * 4;
      red += backgroundImageData.data[index];
      green += backgroundImageData.data[index+1];
      blue += backgroundImageData.data[index+2];
      count++;
    }
  }


      // alpha = backgroundImageData.data[index+3];

  return 'rgb('+[red,green,blue].map(function(d){ return Math.round(d/count);}).join(',')+')';

  // console.log(backgroundImageData);

}


var draw = function(){
  update();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  // ctx.globalAlpha = 0.1;
  ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fill();
  ctx.closePath();
  // ctx.globalAlpha = 1;

  for(var i=0; i<Settings.birdCount; i++){
    if ( birds[i] ){
      birds[i].draw(ctx);
    }
  }

  if ( Settings.overlay > 0 ){
    ctx.globalAlpha = Settings.overlay;
    for ( var j=0; j<voronoiPolygons.length; j++){
      ctx.beginPath();
      // console.log(sampleImageAt(birds[j].location));
      ctx.fillStyle = sampleImageAt(birds[j].location);
      var polygon = voronoiPolygons[j];
      ctx.moveTo(polygon[0][0], polygon[0][1])
      for ( var k=1; k<polygon.length; k++){
        ctx.lineTo(polygon[k][0], polygon[k][1]);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if ( Settings.orig > 0 ){
    ctx.globalAlpha = Settings.orig;
    ctx.drawImage(imageObj, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalAlpha = 1;

  }

  window.requestAnimationFrame(draw);
}


var imageObj = new Image(),
    backgroundImageData,
    imageSize = {};

imageObj.onload = function() {
  var backgroudCanvas = document.createElement("CANVAS");
  backgroudCanvas.width = backgroudCanvas.style.width = this.width;
  backgroudCanvas.height = backgroudCanvas.style.height = this.height;

  var backgroundCtx = backgroudCanvas.getContext('2d');
  backgroundCtx.drawImage(this, 0, 0);

  imageSize['width'] = this.width;
  imageSize['height'] = this.height;

  backgroundImageData = backgroundCtx.getImageData(0, 0, this.width, this.height);

  console.log(backgroundImageData);
  init();
};
imageObj.src = 'starry-night.jpg';





