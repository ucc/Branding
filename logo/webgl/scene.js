/**
 * The UCC Logo on a spinning, bouncing cube
 * Blatantly stolen from a tutorial and modified to bounce off the walls of the canvas
 * Heavy modifications to allow multiple sponsor logos orbiting the UCC cube
 * Tutorial is: https://developer.mozilla.org/en-US/docs/Web/WebGL/Using_textures_in_WebGL
 */

/** The canvas **/
var canvas;
/** gl context **/
var gl;

/** Matrix **/
var mvMatrix;
/** GL Shader Program **/
var shaderProgram;
var vertexPositionAttribute;
var textureCoordAttribute;
var perspectiveMatrix;

/** Bounds of the scene **/
var sceneBounds = {
	min : [-3, -2.5, -15.0],
	max : [3, 2.5, -5.0]
};

/**
 * Debug; display information on the page (for most things this is much nicer than Alt-Tabbing to and fro with Firebug)
 */
function Debug(html, clear)
{
	var div = document.getElementById("debug");
	if (clear)
		div.innerHTML = html;
	else
		div.innerHTML += html;
}


/**
 * Logo constructor
 * @param textureSrc - Texture to use
 * @param size - Size of the cube
 * @param position - Position
 * @param velocity - Velocity per step
 * @param rotationAxis - Axis of rotation
 * @param rotationSpeed - Speed of rotation per step
 * @param reflect - Bounds to reflect off
 * @param attractors - Objects to gravitationally move towards
 * @param repulsors - Objects to gravitationally move away from
 */

// Only Iceweasel understands this
//function Logo(imageSrc, size, position = [2.0*(Math.random()-0.5), 2.0*(Math.random()-0.5), -15 + 10*Math.random()], velocity = [1.0*(Math.random()-0.5), 1.0*(Math.random()-0.5), 1.0*(Math.random()-0.5)], rotationAxis = [Math.random(), Math.random(), Math.random()], rotationSpeed = null, reflect = sceneBounds, attractors = [], repulsors = [])
function Logo(imageSrc, size)
{

	this.size = size;
	this.radius = Math.sqrt(2*this.size);
	this.position = [2.0*(Math.random()-0.5), 2.0*(Math.random()-0.5), -15 + 10*Math.random()];;
	this.velocity = [1.0*(Math.random()-0.5), 1.0*(Math.random()-0.5), 1.0*(Math.random()-0.5)];
	this.acceleration = [0.0, 0.0, 0.0]
	this.rotationAxis = [Math.random(), Math.random(), Math.random()];
	this.rotation = 0.0;
	this.reflect = sceneBounds;	
	this.attractors = [];
	this.repulsors = [];
	this.lastUpdateTime = 0;

	if (Math.random() > 0.5)
		this.rotationSpeed = 30.0 + 20.0 * (Math.random() - 0.5);
	else
		this.rotationSpeed = -30.0 - 20.0 * (Math.random() - 0.5);


	// To be initialised below (Wall of text incoming)
	this.image = null;
	this.texture = null;	
	this.verticesBuffer = null;
	this.verticesTextureCoordBuffer = null;
	this.verticesIndexBuffer = null;
	

	// Vertices of a unit cube (scaled below)
	this.vertices = [
    // Front face
    -1.0, -1.0,  1.0,
     1.0, -1.0,  1.0,
     1.0,  1.0,  1.0,
    -1.0,  1.0,  1.0,
    
    // Back face
    -1.0, -1.0, -1.0,
    -1.0,  1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0, -1.0, -1.0,
    
    // Top face
    -1.0,  1.0, -1.0,
    -1.0,  1.0,  1.0,
     1.0,  1.0,  1.0,
     1.0,  1.0, -1.0,
    
    // Bottom face
    -1.0, -1.0, -1.0,
     1.0, -1.0, -1.0,
     1.0, -1.0,  1.0,
    -1.0, -1.0,  1.0,
    
    // Right face
     1.0, -1.0, -1.0,
     1.0,  1.0, -1.0,
     1.0,  1.0,  1.0,
     1.0, -1.0,  1.0,
    
    // Left face
    -1.0, -1.0, -1.0,
    -1.0, -1.0,  1.0,
    -1.0,  1.0,  1.0,
    -1.0,  1.0, -1.0
	];

	// Scale the cube
	for (var i in this.vertices)
		this.vertices[i] = size*this.vertices[i];
	
	// Initialise vertex buffers
	this.verticesBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW);

	// Map texture onto the cube's faces
	this.verticesTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesTextureCoordBuffer);
	
  	this.textureCoordinates = [
    // Front
	0.0,  0.0,
    0.0,  1.0,   
    1.0,  1.0,
    1.0,  0.0,
    // Back
	0.0,  0.0,
    0.0,  1.0,   
    1.0,  1.0,
    1.0,  0.0,
    // Top
	0.0,  0.0,
    0.0,  1.0,   
    1.0,  1.0,
    1.0,  0.0,
    // Bottom
	0.0,  0.0,
    0.0,  1.0,   
    1.0,  1.0,
    1.0,  0.0,
    // Right
	0.0,  0.0,
    0.0,  1.0,   
    1.0,  1.0,
    1.0,  0.0,
    // Left
	0.0,  0.0,
    0.0,  1.0,   
    1.0,  1.0,
    1.0,  0.0,
  ];

	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.textureCoordinates), gl.STATIC_DRAW);

	// Element array buffer specifies location in vertex array of face's vertices
	this.verticesIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.verticesIndexBuffer);

  var cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ];
	
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);

	// Initialise the texture
	this.texture = gl.createTexture();
	if (imageSrc[0] !== '+')
	{
		this.image = new Image();
		this.image.src = imageSrc;
		var image = this.image;
		var texture = this.texture;
		this.image.onload = function() {handleTextureLoaded(image, texture);};
	}
	else
	{
		var texture = this.texture;
		textTexture(imageSrc.slice(1), texture);
	}
	
}

/**
 * Render the logo
 */
Logo.prototype.Draw = function()
{
	loadIdentity();
	//console.log("Position");
	//console.log(this.position);
	mvTranslate(this.position);
	mvPushMatrix();
	//Debug("<p> Rotation: [" + this.rotation + "]</p><p> Axis: [" + this.rotationAxis + "]</p>");
	mvRotate(this.rotation, this.rotationAxis);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
	gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
	gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesTextureCoordBuffer);
	gl.vertexAttribPointer(textureCoordAttribute, 2, gl.FLOAT, false, 0, 0);
	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, this.texture);
	gl.uniform1i(gl.getUniformLocation(shaderProgram, "uSampler"), 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.verticesIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
	mvPopMatrix();
}

Logo.prototype.Gravity = function(bodies, gravity)
{
	for (var i in bodies)
	{
		b = bodies[i]
		if (b === this)
			continue;
		var dist = 0.0;
		var con;
		var gd;
		for (var j in this.position)
			dist += Math.pow(b.position[j] - this.position[j],2);
		con = -gravity / dist;
		gd = con / Math.sqrt(dist);

		for (var j in this.acceleration)
			this.acceleration[i] -= gd * (b.position[j] - this.position[j])
	}
}

/**
 * Bounce off a surface with normal vector n
 */
Logo.prototype.Bounce = function(n)
{
	var dot = 0;
	for (var j in this.velocity)
		dot += this.velocity[j] * n[j];
	
	for (var j in this.velocity)
	{
		this.velocity[j] = - (2.0 * dot * n[j] - this.velocity[j]);
	}
}

/**
 * Do two objects collide? Returns normal vector at collision, otherwise null
 */
Logo.prototype.Collides = function(b)
{
	
	// [BOB] complained there were no collisions, so I am implementing collisions

	var dist = 0.0;
	for (var i in this.position)
		dist += Math.pow(b.position[i] - this.position[i], 2);
	dist = Math.sqrt(dist);
	if (dist <= this.radius + b.radius)
	{
		// return normal vector from b to this
		var n = [];
		var nMag = 0.0;
		for (var i in this.position)
		{
			n[i] = (this.position[i] - b.position[i]);
			nMag += Math.pow(n[i],2);
		}
		nMag = Math.sqrt(nMag);
		for (var i in n) n[i] /= nMag;
		return n;
	}
	
	return null;
}

/**
 * Detect collision and handle it if it occurs
 */
Logo.prototype.HandleCollision = function(b)
{
	var count = 0;
	var n = this.Collides(b);
	if (n)
	{
		var negN = []; for (var i in n) negN[i] = -n[i];

		var dist = 0.0;
		for (var i in this.position) dist += Math.pow(b.position[i] - this.position[i], 2);
		dist = Math.sqrt(dist);

		// make sure the spheres don't overlap
		var delta = 1.1*(this.radius + b.radius - dist) / 2.0
		for (var i in this.position)
		{
			this.position[i] += n[i] * delta;
			b.position[i] -= n[i] * delta;
		}				

		// bounce both Logos
		this.Bounce(n);
		b.Bounce(negN);
	}
	return n;
}



/**
 * Update the logo position
 */
Logo.prototype.Step = function()
{
	//document.getElementById("debug").innerHTML = "<p> Position: [" + this.position + "]</p><p> Velocity: [" + this.velocity + "]</p>";
	var currentTime = (new Date).getTime();
	// Skip first step
	if (!this.lastUpdateTime)
	{
		this.lastUpdateTime = currentTime;
		return;
	}

	var delta = currentTime - this.lastUpdateTime;
	this.rotation += (this.rotationSpeed * delta) / 1000.0;

	for (var i in this.acceleration) this.acceleration[i] = 0.0;
	this.Gravity(this.attractors, 10);
	this.Gravity(this.repulsors, -10);


	for (var i in this.position)
	{
		this.position[i] += (delta * this.velocity[i]) / 1000.0;
		this.velocity[i] += (delta * this.acceleration[i]) / 1000.0;

		// Enforce a speed limit
		if (this.velocity[i] > 2.0)
			this.velocity[i] *= 0.5;

		if (!this.reflect)
			continue;

		if (this.position[i] < this.reflect.min[i] || this.position[i] > this.reflect.max[i])
		{
			// reflect the vector
			// v = -r
			// r = 2*(v.n)*n - v
			var n = []; for (var j in this.position) n[j] = 0;
			if (this.position[i] < this.reflect.min[i])
			{
				n[i] = 1.0
				this.position[i] = this.reflect.min[i];
			}
			else
			{
				n[i] = -1.0
				this.position[i] = this.reflect.max[i];
			}
			//console.log("Reflect");
			//console.log(n);
			//console.log(cubeVelocity);
			
			this.Bounce(n);
			break;
		}
	}

	for (var i in gObjects)
	{
		if (gObjects[i] === this)
			continue;
		var n = this.HandleCollision(gObjects[i]);
		
	}

	this.lastUpdateTime = currentTime;
}

/**
 * Creates a sphere vertex array
 */

function MakeSphere(latitudeBands, longitudeBands)
{
	var vertexPositionData = [];
	for (var latNumber=0; latNumber <= latitudeBands; latNumber++) 
	{
		var theta = latNumber * Math.PI / latitudeBands;
		var sinTheta = Math.sin(theta);
		var cosTheta = Math.cos(theta);

		for (var longNumber=0; longNumber <= longitudeBands; longNumber++) 
		{
			var phi = longNumber * 2 * Math.PI / longitudeBands;
			var sinPhi = Math.sin(phi);
			var cosPhi = Math.cos(phi);
	
			var x = cosPhi * sinTheta;
			var y = cosTheta;
			var z = sinPhi * sinTheta;
			var u = 1 - (longNumber / longitudeBands);
			var v = 1 - (latNumber / latitudeBands);
	
			normalData.push(x);
			normalData.push(y);
			normalData.push(z);
			textureCoordData.push(u);
			textureCoordData.push(v);
			vertexPositionData.push(radius * x);
			vertexPositionData.push(radius * y);
			vertexPositionData.push(radius * z);
		}
	}
	return vertexPositionData;
}


/**
 * Called when the canvas is created to get the ball rolling. (ho ho ho)
 */
function start() {

	// Browser is all like "WTF is WebGL"
	if (!window.WebGLRenderingContext)
	{
		alert("To view the UCC Logo in its full glory, use a browser that supports WebGL.\n\nYou have been redirected to http://www.mozilla.org/en-US/firefox/new/");
		setTimeout(function() {window.location.href = "http://www.mozilla.org/en-US/firefox/new/";}, 1);
		return;
	}
	
	canvas = document.getElementById("glcanvas");

  initWebGL(canvas);      // Initialize the GL context
  
	// Browser is all like "fglrx segfaulted"
	if (!gl)
	{
		alert("Alas! Your browser supports WebGL but couldn't initialise it.\n(This probably means you are using shitty fglrx drivers).\n\nYou have been redirected to http://get.webgl.org/troubleshooting");
		setTimeout(function() {window.location.href = "http://get.webgl.org/troubleshooting";}, 1);
		return;
	}


    gl.clearColor(0.9, 0.9, 1.0, 1.0);  // Clear to white, fully opaque
    gl.clearDepth(1.0);                 // Clear everything
    gl.enable(gl.DEPTH_TEST);           // Enable depth testing
    gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
    
    // Initialize the shaders; this is where all the lighting for the
    // vertices and so forth is established.
    
    initShaders();
    
	gObjects = []
	// Steamroller doesn't roll with Chromium
	//gObjects.steamroller = new Logo(uccSteamroller, 1.0);
	gObjects["cube"] = new Logo(uccLogo, 1.0);
	//gObjects.uwa = new Logo(uwaLogo, 0.5);
	//gObjects.guild = new Logo(guildLogo, 0.5);
	//gObjects.netapp = new Logo(netappLogo, 0.5);
	//gObjects.sla = new Logo(uccSLA, );
	gObjects["underConstruction"] = new Logo(underConstruction, 1.0);
	//gObjects.aesop = new Logo("+"+aesopText, 1.0);
	gObjects["html5"] = new Logo(html5Logo, 1.0);
	

	//gObjects.guild.attractors = [gObjects.cube];
	//gObjects.cube.attractors = [gObjects.guild];
	//gObjects.steamroller.attractors = [gObjects.cube, gObjects.guild];
	
	gObjects["cube"].position = [0.0,0.0,-10.0];
	gObjects["cube"].rotationSpeed = Math.max(gObjects.cube.rotationSpeed, 30);
    
    setInterval(drawScene, 15);

	// Show off our amazing logo by allowing people to add more!
	canvas.onmousedown = function(event)
	{
		var src = uccLogo;
		if (Math.random() > 1.0/3.0)
			src = (Math.random() > 0.5) ? underConstruction : html5Logo;
		var obj = new Logo(src, 0.5);
		gObjects[gObjects.length] = obj;
		obj.position[0] = event.clientX / canvas.width;
		obj.position[1] = 1.0 - (event.clientY / canvas.height);
	};
  
}

//
// initWebGL
//
// Initialize WebGL, returning the GL context or null if
// WebGL isn't available or could not be initialized.
//
function initWebGL() {
  gl = null;
  
  try {
    gl = canvas.getContext("experimental-webgl");
  }
  catch(e) {
  }
  
  // If we don't have a GL context, give up now
  
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
  }
}


function wrapText(context, text, x, y, maxWidth, lineHeight) {
    var words = text.split(' ');
    var line = '';

    for(var n = 0; n < words.length; n++)
	{
      var testLine = line + words[n] + ' ';
      var metrics = context.measureText(testLine);
      var testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        context.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      }
      else {
        line = testLine;
      }

	}
    context.fillText(line, x, y);
}

function textTexture(text, texture)
{
	gl.bindTexture(gl.TEXTURE_2D, texture);
	var canvas = document.createElement("canvas");
	canvas.width = 512; canvas.height = 512;
	var ctx = canvas.getContext("2d");
	ctx.font = "20px Courier Bold";
	wrapText(ctx,text, 0.1*canvas.width, 0.1*canvas.height, 0.8*canvas.width, 21);
		ctx.beginPath();
		ctx.moveTo(0,0);
		ctx.lineTo(canvas.width,0);
		ctx.lineTo(canvas.width,canvas.height);
		ctx.lineTo(0,canvas.height);
		ctx.lineTo(0,0);
		ctx.stroke();

	var image = canvas;
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

function handleTextureLoaded(image, texture)
{
	//console.log("handleTextureLoaded, image = " + image);
	gl.bindTexture(gl.TEXTURE_2D, texture);
	// scale non power of two images
	if ((image.width & (image.width - 1)) != 0 || (image.height & (image.height - 1)) != 0)
	{
		var canvas = document.createElement("canvas");
		var w = image.width; var h = image.height;
		--w; for (var i = 1; i < 32; i <<= 1) w = w | w >> i; ++w;
		--h; for (var i = 1; i < 32; i <<= 1) h = h | h >> i; ++h;
		canvas.width = w;
		canvas.height = h;
		var ctx = canvas.getContext("2d");
		
		ctx.drawImage(image, w/2 - image.width/2, h/2 - image.height/2, image.width, image.height);
		//ctx.font = "30px Courier";
		//ctx.fillText("hello world\nhow are you", 0.1*w, h/2, 0.8*w);
		ctx.beginPath();
		ctx.moveTo(0,0);
		ctx.lineTo(w,0);
		ctx.lineTo(w,h);
		ctx.lineTo(0,h);
		ctx.lineTo(0,0);
		ctx.stroke();
		image = canvas;
	}

	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
	gl.generateMipmap(gl.TEXTURE_2D);
	gl.bindTexture(gl.TEXTURE_2D, null);
}

//
// drawScene
//
// Draw the scene.
//
function drawScene() 
{

	
	// Clear the canvas before we start drawing on it.
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
	// Establish the perspective with which we want to view the
	// scene. Our field of view is 45 degrees, with a width/height
	// ratio of 640:480, and we only want to see objects between 0.1 units
	// and 100 units away from the camera.
	perspectiveMatrix = makePerspective(45, canvas.width/canvas.height, 0.1, 100.0);
  


	// Step and Draw objects
	for (var i in gObjects)
	{
		gObjects[i].Step();
		gObjects[i].Draw();
	}
}

//
// initShaders
//
// Initialize the shaders, so WebGL knows how to light our scene.
//
function initShaders() {
  var fragmentShader = getShader(gl, "shader-fs");
  var vertexShader = getShader(gl, "shader-vs");
  
  // Create the shader program
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  
  // If creating the shader program failed, alert
  
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Unable to initialize the shader program.");
  }
  
  gl.useProgram(shaderProgram);
  
  vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(vertexPositionAttribute);
  
  textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
  gl.enableVertexAttribArray(textureCoordAttribute);
}

//
// getShader
//
// Loads a shader program by scouring the current document,
// looking for a script with the specified ID.
//
function getShader(gl, id) {
  var shaderScript = document.getElementById(id);
  
  // Didn't find an element with the specified ID; abort.
  
  if (!shaderScript) {
    return null;
  }
  
  // Walk through the source element's children, building the
  // shader source string.
  
  var theSource = "";
  var currentChild = shaderScript.firstChild;
  
  while(currentChild) {
    if (currentChild.nodeType == 3) {
      theSource += currentChild.textContent;
    }
    
    currentChild = currentChild.nextSibling;
  }
  
  // Now figure out what type of shader script we have,
  // based on its MIME type.
  
  var shader;
  
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;  // Unknown shader type
  }
  
  // Send the source to the shader object
  
  gl.shaderSource(shader, theSource);
  
  // Compile the shader program
  
  gl.compileShader(shader);
  
  // See if it compiled successfully
  
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
    return null;
  }
  
  return shader;
}

//
// Matrix utility functions
//

function loadIdentity() {
  mvMatrix = Matrix.I(4);
}

function multMatrix(m) {
  mvMatrix = mvMatrix.x(m);
}

function mvTranslate(v) {
  multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
}

function setMatrixUniforms() {
  var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()));

  var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));
}

var mvMatrixStack = [];

function mvPushMatrix(m) {
  if (m) {
    mvMatrixStack.push(m.dup());
    mvMatrix = m.dup();
  } else {
    mvMatrixStack.push(mvMatrix.dup());
  }
}

function mvPopMatrix() {
  if (!mvMatrixStack.length) {
    throw("Can't pop from an empty matrix stack.");
  }
  
  mvMatrix = mvMatrixStack.pop();
  return mvMatrix;
}

function mvRotate(angle, v) {
  var inRadians = angle * Math.PI / 180.0;
  
  var m = Matrix.Rotation(inRadians, $V([v[0], v[1], v[2]])).ensure4x4();
  multMatrix(m);
}
