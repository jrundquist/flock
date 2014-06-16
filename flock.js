window.onresize  = function(){
  if ( ctx ) {
    document.getElementById('canvas').width = window.outerWidth;
    document.getElementById('canvas').height = window.outerHeight;
  }
}

var birds = [];


var Settings = {
  birdCount: 50,
  maxBirdVelocity: 0.1,
  repulseRadius: 10,
  followRadius: 30,
  attractRadius: 40,
  birdSize: 3
};

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

Vector.prototype.subtract = function(otherVector){
  this.c1 -= otherVector.c1;
  this.c2 -= otherVector.c2;
  return this;
}

Vector.prototype.normalize = function(){
  var sum = this.c1 + this.c2;
  this.c1 /= sum;
  this.c2 /= sum;
  return this;
}

Vector.prototype.scale = function(mult){
  this.c1 *= mult;
  this.c2 *= mult;
  return this;
}

Vector.prototype.limit = function(max){
  this.c1 = Math.min(max, this.c1);
  this.c2 = Math.min(max, this.c2);
  return this;
}

Vector.prototype.wrap = function(boundsOne, boundsTwo){
  if ( this.c1 <= boundsOne[0] ){
    this.c1 += boundsOne[1];
  } else if ( this.c1 >= boundsOne[1] ){
    this.c1 -= boundsOne[1];
  }
  if ( this.c2 <= boundsTwo[0] ){
    this.c2 += boundsTwo[1];
  } else if ( this.c2 >= boundsTwo[1] ){
    this.c2 -= boundsTwo[1];
  }
  return this;
}

Vector.prototype.distance = function(other){
  return Math.sqrt(Math.pow(this.c1 - other.c1, 2) + Math.pow(this.c2 - other.c2, 2));
}


var Bird = function(){
  this.location = new Vector(Math.random() * window.outerWidth, Math.random() * window.innerHeight);
  this.velocity = new Vector(Math.random() * -Settings.maxBirdVelocity, Math.random() * Settings.maxBirdVelocity);
  return this;
}

Bird.prototype.update = function(){
  var acceleration = this.flock();
  this.velocity.add(acceleration).limit(Settings.maxBirdVelocity);
  this.location.add(this.velocity).wrap([0, ctx.canvas.width], [0, ctx.canvas.height]);
}


Bird.prototype.flock = function(neighbors){
  var acceleration = new Vector(0, 0);
  return acceleration;
}

Bird.prototype.draw = function(ctx){
  var velocityScale = 10
  ctx.fillStyle = "#fa0";
  ctx.strokeStyle = "#0af";
  ctx.strokeWidth = "2";
  ctx.beginPath();
  ctx.arc(this.location.c1, this.location.c2, Settings.birdSize, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
  ctx.beginPath();
  ctx.moveTo(this.location.c1, this.location.c2);
  ctx.lineTo(this.location.c1 + this.velocity.c1 * velocityScale, this.location.c2 + this.velocity.c2 * velocityScale);
  ctx.stroke();
  ctx.closePath();
};


var init = function(){
  document.getElementById('canvas').width = window.outerWidth;
  document.getElementById('canvas').height = window.outerHeight;
  window.ctx = document.getElementById('canvas').getContext('2d')
  for(var i=0; i<Settings.birdCount; i++){
    birds.push(new Bird());
  }
  window.requestAnimationFrame(draw);
}

Bird.prototype.safeDistanceTo = function(other){
  var d = this.location.distance(other.location);//
  return Math.max(1e-2, d);
}



Bird.prototype.cohereTo = function(other){
};
Bird.prototype.alignWith = function(other){
};
Bird.prototype.avoid = function(other){
};


Bird.prototype.interactWithMaybe = function(other){
  var d = this.safeDistanceTo(other);
  if ( d < Settings.attractRadius && d >= Settings.followRadius ){

    this.cohereTo(other);
    // other.cohereTo(this);
    // var td = (other.t - this.t) / 10,
    //     mult = (this.t < other.t)?1:-1;
    // this.t += td * mult;
    // other.t -= td * mult;
  } else if ( d < Settings.followRadius && d >= Settings.repulseRadius ){
    this.alignWith(other);
    other.alignWith(this);
    // var vd = (other.v - this.v) / 10,
    //     mult = (this.v < other.v)?1:-1;
    // this.v += vd * mult;
    // other.v -= vd * mult;
  } else if ( d < Settings.repulseRadius){
    this.avoid(other);
    other.avoid(this);
    // this.v = this.v - this.v / 2;
  }
  this.update();
}


var update = function(){
  //no-op for now;
  birds.map(function(birdOne, i){
    birds.map(function(birdTwo, j){
      if ( birdTwo !== birdOne && i < j ){
        birdOne.interactWithMaybe(birdTwo);
      }
    });
  });
}


var draw = function(){
  update();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fill();
  ctx.closePath();

  for(var i=0; i<Settings.birdCount; i++){
    if ( birds[i] ){
      birds[i].draw(ctx);
    }
  }

  window.requestAnimationFrame(draw);
}





init();
