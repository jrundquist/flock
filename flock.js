window.onresize  = function(){
  if ( ctx ) {
    document.getElementById('canvas').width = window.outerWidth;
    document.getElementById('canvas').height = window.outerHeight;
  }
}

var birds = [];


var Settings = {
  birdCount: 50,
  maxBirdVelocity: 2,
  repulseRadius: 15,
  followRadius: 30,
  attractRadius: 40,
  maxForce: 1,
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
  var neighbours = birds.filter((function(b){ return b !== this;}).bind(this)),
      acceleration = this.flock(neighbours);
  this.velocity.add(acceleration).limit(Settings.maxBirdVelocity);
  this.location.add(this.velocity).wrap([0, ctx.canvas.width], [0, ctx.canvas.height]);
}


Bird.prototype.flock = function(neighbours){
    var avoid = this.avoid(neighbours),//.multiply(SEPARATION_WEIGHT)
        alignment = this.align(neighbours),//.multiply(ALIGNMENT_WEIGHT)
        cohesion = this.cohere(neighbours);//.multiply(COHESION_WEIGHT)
    return avoid.add(alignment).add(cohesion);
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
    if ( d >= Settings.followRadius && d < Settings.attractRadius  ){
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
    if ( d < Settings.followRadius && d >= Settings.repulseRadius ){
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
  document.getElementById('canvas').width = window.outerWidth;
  document.getElementById('canvas').height = window.outerHeight;
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
