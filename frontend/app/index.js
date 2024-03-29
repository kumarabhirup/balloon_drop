/* eslint-disable no-empty */
/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
/* eslint-disable prefer-const */

let myFont // The font we'll use throughout the app

let gameOver = false // If it's true the game will render the main menu
let gameBeginning = true // Should be true only before the user starts the game for the first time
let canEnd = false
let gameStart = false

// Game Objects
let house
let balloon
let shootingBalloon
let runner

// Game Stuffs
let shootingBalloons = []
let particles = []
let floatingTexts = []
let comboTexts = []

// Buttons
let playButton
let soundButton
let leaderboardButton
let endButton
let shootButton

// Score data
let startingLives
let scoreGain
let highScore
let score = 0

// Data taken from Game Settings
// Images
let imgHouse
let imgBalloon
let imgShootingBalloon
let imgMoverLeft
let imgMoverRight
let imgMoverStill
let imgLife
let imgBackground

// Audio
let sndMusic
let sndTap
let sndMatch
let sndEnd
let sndRunnerHit
let sndHouseHit
let sndLife

let soundEnabled = true
let canMute = true

let soundImage
let muteImage

// Timer
let startingGameTimer
let gameTimer
let gameTimerEnabled = false
let gameOverRectangleHeight = 0 // for game over animation

let canScore = false

// Size stuff
let objSize // Base size modifier of all objects, calculated based on screen size

/**
 * @description Game size in tiles
 * using bigger numbers will decrease individual object sizes but allow more objects to fit the screen
 * Keep in mind that if you change this, you might need to change text sizes as well
 */
const gameSize = 18

// Mobile
let isMobile = false
let touching = false // Whether the user is currently touching/clicking
let isBalloonDraggable = false

// Load assets
function preload() {
  // Load font from google fonts link provided in game settings
  const link = document.createElement('link')
  link.href = Koji.config.strings.fontFamily
  link.rel = 'stylesheet'
  document.head.appendChild(link)
  myFont = getFontFamily(Koji.config.strings.fontFamily)
  const newStr = myFont.replace('+', ' ')
  myFont = newStr

  // Load background if there's any
  if (Koji.config.images.background !== '') {
    imgBackground = loadImage(Koji.config.images.background)
  }

  // Load images
  imgBalloon = loadImage(Koji.config.images.balloonImage)
  imgShootingBalloon = loadImage(Koji.config.images.shootingBalloonImage)
  imgHouse = loadImage(Koji.config.images.houseImage)
  imgMoverLeft = loadImage(Koji.config.images.movingLeft)
  imgMoverRight = loadImage(Koji.config.images.movingRight)
  imgMoverStill = loadImage(Koji.config.images.notMoving)
  imgLife = loadImage(Koji.config.images.lifeIcon)
  soundImage = loadImage(Koji.config.images.soundImage)
  muteImage = loadImage(Koji.config.images.muteImage)

  /**
   * Load Sounds here
   * Include a simple IF check to make sure there is a sound in config, also include a check when you try to play the sound, so in case there isn't one, it will just be ignored instead of crashing the game
   * Music is loaded in setup(), to make it asynchronous
   */
  if (Koji.config.sounds.tap) sndTap = loadSound(Koji.config.sounds.tap)
  if (Koji.config.sounds.match) sndMatch = loadSound(Koji.config.sounds.match)
  if (Koji.config.sounds.end) sndEnd = loadSound(Koji.config.sounds.end)
  if (Koji.config.sounds.enemyHit)
    sndRunnerHit = loadSound(Koji.config.sounds.enemyHit)
  if (Koji.config.sounds.explosion)
    sndHouseHit = loadSound(Koji.config.sounds.explosion)
  if (Koji.config.sounds.life) sndLife = loadSound(Koji.config.sounds.life)

  // Load settings from Game Settings
  scoreGain = parseInt(Koji.config.strings.scoreGain)
  startingLives = parseInt(Koji.config.strings.lives)
  comboTexts = Koji.config.strings.comboText.split(',')
  startingGameTimer = parseInt(Koji.config.strings.gameTimer)
  lives = startingLives

  // Timer stuff
  if (startingGameTimer <= 0) {
    gameTimer = 99999
    gameTimerEnabled = false
  } else {
    gameTimer = startingGameTimer
    gameTimerEnabled = true
  }
}

// Instantiate objects
function instantiate() {
  balloon = new Balloon(
    { x: width / 2, y: objSize * 5 },
    { width: 4 * objSize, height: 8 * objSize },
    {
      shape: 'rectangle',
      image: imgBalloon,
    }
  )
  shootingBalloon = new Balloon(
    { x: width / 2, y: balloon.sizing.height + objSize },
    { width: objSize, height: 2 * objSize },
    {
      shape: 'rectangle',
      image: imgShootingBalloon,
      color: { r: 255, g: 255, b: 255 },
      rotate: true,
    }
  )
  house = new GameObject(
    { x: width / 2, y: height - objSize * 3.8 },
    { radius: 3 * objSize },
    {
      shape: 'circle',
      image: imgHouse,
    }
  )
  runner = new Runner(
    { x: width / 2, y: height - objSize * 3 },
    { width: 3 * objSize, height: 4 * objSize },
    {
      shape: 'rectangle',
      image: imgMoverStill,
    }
  )
}

// Setup your props
function setup() {
  width = window.innerWidth
  height = window.innerHeight

  // How much of the screen should the game take, this should usually be left as it is
  let sizeModifier = 0.75
  if (height > width) {
    sizeModifier = 1
  }

  createCanvas(width, height)

  // Magically determine basic object size depending on size of the screen
  objSize = floor(
    min(floor(width / gameSize), floor(height / gameSize)) * sizeModifier
  )
  scoreSize = objSize * 1

  isMobile = detectMobile()

  textFont(myFont) // set our font
  document.body.style.fontFamily = myFont

  playButton = new PlayButton()
  soundButton = new SoundButton()
  leaderboardButton = new LeaderboardButton()
  endButton = new EndButton()
  shootButton = new ShootButton()

  gameBeginning = true

  instantiate()

  /**
   * Load music asynchronously and play once it's loaded
   * This way the game will load faster
   */
  if (Koji.config.sounds.backgroundMusic)
    sndMusic = loadSound(Koji.config.sounds.backgroundMusic, () =>
      playMusic(sndMusic, 0.4, false)
    )
}

// An infinite loop that never ends in p5
function draw() {
  // Manage cursor - show it on main menu, and hide during game, depending on game settings
  if (!gameOver && !gameBeginning) {
    if (!Koji.config.strings.enableCursor) {
      noCursor()
    }
  } else {
    cursor(ARROW)
  }

  // Draw background or a solid color
  if (imgBackground) {
    background(imgBackground)
  } else {
    background(Koji.config.colors.backgroundColor)
  }

  // Draw UI
  if (gameOver || gameBeginning) {
    gameBeginningOver()
  } else {
    gamePlay()
  }

  soundButton.render()
}

/**
 * Go through objects and see which ones need to be removed
 * A good practive would be for objects to have a boolean like removable, and here you would go through all objects and remove them if they have removable = true;
 */
function cleanup() {
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < floatingTexts.length; i++) {
    if (floatingTexts[i].timer <= 0) {
      floatingTexts.splice(i, 1)
    }
  }
}

// Call this when a lose life event should trigger
function loseLife() {
  // eslint-disable-next-line no-plusplus
  lives--

  if (lives <= 0) {
    gameOver = true
    checkHighscore()

    if (score > 1) {
      goSetScore(score)
    }
  }
}

// Handle input
function touchStarted() {
  if (gameOver || gameBeginning) {
  }

  if (soundButton.checkClick()) {
    toggleSound()
    return
  }

  if (!gameOver && !gameBeginning) {
    // InGame
    touching = true

    if (canEnd) {
      gameOver = true
      if (score > 1) {
        goSetScore(score)
      }
    }
  }
}

function touchEnded() {
  // This is required to fix a problem where the music sometimes doesn't start on mobile
  if (soundEnabled) {
    if (getAudioContext().state !== 'running') {
      getAudioContext().resume()
    }
  }

  touching = false

  if (!gameOver && !gameBeginning) {
    if (isMobile && gameStart && !canEnd && !shootingBalloon.shooting)
      balloon.shoot() // shoot by button click on mobile
  }
}

// Key pressed and released
function keyPressed() {
  if (!gameOver && !gameBeginning) {
    if (keyCode === LEFT_ARROW || key === 'a') {
      balloon.moveDir = -1
      shootingBalloon.moveDir = -1
    }

    if (keyCode === RIGHT_ARROW || key === 'd') {
      balloon.moveDir = 1
      shootingBalloon.moveDir = 1
    }
  }
}

function keyReleased() {
  if (!gameOver && !gameBeginning) {
    if (
      key === ' ' ||
      keyCode === ENTER ||
      keyCode === DOWN_ARROW ||
      key === 's'
    ) {
      if (!canEnd && !shootingBalloon.shooting) balloon.shoot() // shoot by keys on desktop
    }

    if ((keyCode === LEFT_ARROW || key === 'a') && balloon.moveDir === -1) {
      balloon.moveDir = 0
      shootingBalloon.moveDir = 0
    }

    if ((keyCode === RIGHT_ARROW || key === 'd') && balloon.moveDir === 1) {
      balloon.moveDir = 0
      shootingBalloon.moveDir = 0
    }
  }
}

/**
 * Call this every time you want to start or reset the game
 * This is a good place to clear all arrays like enemies, bullets etc before starting a new game
 */
function init() {
  gameOver = false

  lives = startingLives
  highscoreGained = false
  score = 0

  gameTimer = startingGameTimer
  gameOverRectangleHeight = 0

  floatingTexts = []
  particles = []

  // Keep everyone at their original place
  instantiate()

  floatingTexts.push(
    new OldFloatingText(
      width / 2,
      height / 2 - height * 0.01,
      Koji.config.strings.gameStartedFloatingText,
      Koji.config.colors.floatingTextColor,
      objSize * 1.2,
      2
    )
  )

  canScore = false
  canEnd = false

  // set score to zero if score increases mistakenly
  setTimeout(() => {
    score = 0
    gameStart = true
  }, 1000)
}
