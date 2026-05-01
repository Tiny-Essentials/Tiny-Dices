import { isJsonObject } from './tiny-modules/basics/objChecker.mjs';
import TinyColorValidator from './tiny-modules/libs/TinyColorValidator.mjs';

/**
 * @typedef {Object} PreDiceResult
 * @property {number[]} sequence The sequence of values shown on each face.
 * @property {() => number[]} reRollDice Function that re-rolls the dice and returns the new sequence.
 * @property {() => void} stop Function that stops the dice rolling.
 * @property {NodeJS.Timeout|null} stopTimeout Reference to the timeout controlling the dice stop, or null if not set.
 */

/**
 * The final dice result.
 * @typedef {PreDiceResult & { result: number }} DiceResult
 */

/**
 * @typedef {Object} DiceElement
 * @property {HTMLElement[]} faces - An array of six face elements.
 * @property {HTMLElement|null} container - The outer wrapper element.
 * @property {HTMLElement|null} wrapper - The rotating inner cube element.
 */

/**
 * @typedef {Object} CubeResult
 * @property {HTMLDivElement} cube - The DOM element representing the cube container.
 * @property {number[]} sequence - The final sequence of values shown on each face.
 * @property {() => number[]} reRollDice - Function that re-rolls the dice and returns the new sequence.
 * @property {NodeJS.Timeout|null} stopTimeout - stopTimeout Reference to the timeout controlling the cube stop, or null if not set.
 * @property {() => void} stop - Function that stops the cube rolling.
 */

/**
 * TinyDices - JavaScript class for rendering animated 3D dice with HTML/CSS.
 *
 * Created by: Yasmin Seidel (JasminDreasond)
 * Co-developed with: ChatGPT (OpenAI) as coding assistant
 *
 * Features:
 * - Roll any number of dice
 * - Supports custom max values per die
 * - Optional spinning animation (infinite or ending)
 * - Dynamic cube generation and animation
 * - Option to include zero in rolls (canZero)
 *
 * Usage:
 * const container = document.getElementById('myDice');
 * const dice = new TinyDices(container);
 *
 * dice.roll('7,7,7');                    // Rolls 3d6
 * dice.roll('6,12,20');                 // Rolls d6, d12, and d20
 * dice.roll([10, 10], false, true);     // Rolls 2d10 with infinite spin
 * dice.roll([10, 10], true);            // Rolls 2d10 starting from 0
 * dice.roll([4, 8, 6], true, true);     // Rolls d4, d8, and d6 from 0 with infinite spin
 *
 * Customization:
 * dice.setBgSkin('gray');                // Sets background skin to gray
 * dice.setTextSkin('red');               // Sets text skin to red
 * dice.setBorderSkin('2px solid black'); // Sets border skin to black
 *
 * dice.getBgSkin();                       // Gets current or default background skin
 * dice.getTextSkin();                     // Gets current or default text skin
 * dice.getBorderSkin();                   // Gets current or default border skin
 */
class TinyDices {
  /**
   * Stores all current dice elements created by the instance.
   *
   * Each element follows the `DiceElement` structure, containing cube faces,
   * its container, and the cube wrapper for rotation.
   *
   * @type {DiceElement[]}
   */
  #elements = [];

  #cubeId = 0; // used for incremental z-index to avoid overlapping issues
  #destroyed = false;
  #stopTime = 2000;
  #rdChangerAmount = 1000;

  /** @type {string|null} */ #defaultBgSkin = 'linear-gradient(135deg, #ff3399, #33ccff)';
  /** @type {string|null} */ #defaultBorderSkin = '2px solid rgba(255, 255, 255, 0.2)';
  /** @type {string|null} */ #defaultSelectionTextSkin = '#FFF';
  /** @type {string|null} */ #defaultSelectionBgSkin = '#000';
  /** @type {string|null} */ #defaultTextSkin = 'white';
  /** @type {string|null} */ #selectionBgSkin = null;
  /** @type {string|null} */ #selectionTextSkin = null;
  /** @type {string|null} */ #bgSkin = null;
  /** @type {string|null} */ #bgImg = null;
  /** @type {string|null} */ #textSkin = null;
  /** @type {string|null} */ #borderSkin = null;

  /** @type {HTMLElement|null} */ #diceBase = null;
  /** @type {HTMLElement|null} */ diceArea = null;
  /** @type {HTMLElement|null} */ container = null;

  /**
   * Creates a cube DOM element with animated faces and randomized values.
   *
   * @param {number} result - The main value to appear on the front face.
   * @param {number} max - The maximum possible value for the die.
   * @param {boolean} [rollInfinity=false] - If true, the cube will spin infinitely.
   * @returns {CubeResult} - The cube element and an array of all face values.
   */
  #createCube;

  /**
   * Creates a new TinyDices instance attached to a specified HTML element.
   *
   * @param {HTMLElement} diceBase - The HTML container element where the dice will be rendered.
   * @param {(result: number, max: number, canZero?: boolean, rollInfinity?: boolean) => CubeResult} [createCubeScript=null]
   *        - Optional function to override the internal cube creation logic.
   *          If provided, it will be used instead of the built-in method.
   *
   *          The function should accept the following parameters:
   *            - result {number} - The main value to appear on the front face of the die.
   *            - max {number} - The maximum value allowed for a face of the die.
   *            - canZero {boolean} [optional] - If true, faces can include the number 0.
   *            - rollInfinity {boolean} [optional] - If true, the die spins infinitely.
   *
   *          And return:
   *            - {HTMLElement} cube - The DOM element representing the dice cube.
   *            - {number[]} sequence - An array containing all the face values of the die.
   *
   *
   * When implementing a custom dice creation logic, you can use the following internal methods:
   *
   * @function tinyDice.addElement
   * Adds a structured dice object to the internal list for tracking and future cleanup.
   * This method expects an object with `faces`, `container`, and `wrapper` properties.
   *
   * @function tinyDice.rollNumber(max: number, canZero: boolean): number
   * Generates a random number based on the maximum value and zero allowance.
   * Useful when assigning values to non-front faces of the die.
   *
   * @function tinyDice.updateDiceFaceSkin(face: HTMLElement): void
   * Applies the dice face style or skin to a given face element.
   * This is usually a visual effect or texture that the user can define.
   *
   * @function tinyDice.addCubeId(): number
   * Returns a unique identifier for each die. This value is typically used to set the `z-index`
   * of the container, so that new dice appear above older ones.
   *
   *
   */
  constructor(diceBase, createCubeScript) {
    if (typeof createCubeScript === 'function') this.#createCube = createCubeScript;
    else this.#insertCreateCube();
    if (typeof HTMLElement !== 'undefined' && diceBase instanceof HTMLElement) {
      this.#diceBase = diceBase;
      this.#diceBase.classList.add('tiny-dices-body');

      this.diceArea = document.createElement('div');
      this.diceArea.classList.add('dice-area');

      this.#diceBase.appendChild(this.diceArea);
    }
  }

  /**
   * Internal helper to check if the dice base element is a valid HTMLElement.
   *
   * @returns {boolean} - True if #diceBase is a valid HTMLElement.
   */
  #existsHtml() {
    return typeof HTMLElement !== 'undefined' && this.#diceBase instanceof HTMLElement
      ? true
      : false;
  }

  /**
   * Checks if the internal HTML structure (dice base container) still exists in the DOM.
   *
   * Useful to verify if the TinyDices component is still rendered and operational.
   *
   * @returns {boolean} - Returns `true` if the HTML elements exist, otherwise `false`.
   */
  existsHtml() {
    return this.#existsHtml();
  }

  /**
   * Increments and returns the current cube ID.
   *
   * This ID is used to set a unique z-index for each die,
   * ensuring that newer dice appear above older ones in the stack.
   *
   * @returns {number} The current cube ID before incrementing.
   */
  addCubeId() {
    return this.#cubeId++;
  }

  /**
   * Validates and stores a new dice element into the internal list.
   *
   * This method ensures that the given object has the correct structure
   * before appending it to the internal array of rendered dice elements.
   *
   * @param {DiceElement} item - The dice element object to validate and store.
   * @returns {boolean} `true` if the item was valid and added; otherwise, `false`.
   */
  #addElement(item) {
    if (
      isJsonObject(item) &&
      Array.isArray(item.faces) &&
      typeof HTMLElement !== 'undefined' &&
      item.container instanceof HTMLElement &&
      item.wrapper instanceof HTMLElement
    ) {
      this.#elements.push(item);
      return true;
    }
    return false;
  }

  /**
   * Adds a new dice element to the internal storage.
   *
   * This is the public wrapper for the internal method `#addElement`.
   * It validates the structure of the dice element before adding.
   *
   * @param {DiceElement} item
   *        - The dice element object to add. It must contain:
   *          - `faces`: an array of six face elements,
   *          - `container`: the outer wrapper element,
   *          - `wrapper`: the rotating inner cube element.
   *
   * @returns {boolean} `true` if the element was valid and added, otherwise `false`.
   */
  addElement(item) {
    return this.#addElement(item);
  }

  /**
   * Validates a background-image value restricted to safe data:image URLs only.
   *
   * @param {string} value - The CSS background-image value.
   * @returns {boolean}
   */
  #isValidDataImage(value) {
    if (typeof value !== 'string') return false;
    const normalized = value.trim();

    // Only allow data:image/... base64 or URL-encoded images
    const dataUrlPattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,[a-z0-9+\/=]+$/i;

    return dataUrlPattern.test(normalized);
  }

  /**
   * Validates a linear-gradient string to prevent unsafe or malformed styles.
   *
   * @param {string} value - The CSS gradient string.
   * @returns {boolean}
   */
  #isValidLinearGradient(value) {
    if (typeof value !== 'string') return false;
    const normalized = value.trim().toLowerCase();

    // Must start with 'linear-gradient(' and end with ')'
    if (!normalized.startsWith('linear-gradient(') || !normalized.endsWith(')')) {
      return false;
    }

    // Block unsafe patterns
    const unsafePattern = /(url\s*\(|expression\s*\(|javascript:|<|>|data:)/i;
    if (unsafePattern.test(value)) {
      return false;
    }

    // Extract content inside the parentheses
    const content = value.slice(value.indexOf('(') + 1, -1).trim();
    if (!content) return false;

    // Safe split by commas outside of parentheses
    const parts = [];
    let buffer = '';
    let depth = 0;

    for (let char of content) {
      if (char === '(') depth++;
      if (char === ')') depth--;

      if (char === ',' && depth === 0) {
        parts.push(buffer.trim());
        buffer = '';
      } else {
        buffer += char;
      }
    }

    if (buffer.trim()) parts.push(buffer.trim());
    if (parts.length < 1) return false; // needs at least one component

    let colorCount = 0;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      // First item can optionally be a direction or angle
      if (i === 0 && /^(to\s+\w+|\d+deg|[+-]?\d+rad|[+-]?\d+turn)$/i.test(part)) {
        continue;
      }

      if (!!TinyColorValidator.isColor(part.trim())) {
        colorCount++;
      } else {
        // Extract possible color value before any stop (e.g. "red 20%" → "red")
        const colorCandidate = part.trim().split(/\s+/)[0];

        if (!!TinyColorValidator.isColor(colorCandidate)) {
          colorCount++;
        } else {
          return false; // invalid color
        }
      }
    }

    // Must have at least 1 valid color and no more than 50
    return colorCount >= 1 && colorCount <= 50;
  }

  /**
   * Validates a CSS border string like '1px solid red' or '2px dashed linear-gradient(...)'.
   *
   * @param {string} value - The CSS border string.
   * @returns {boolean}
   */
  #isValidCssBorder(value) {
    if (typeof value !== 'string') return false;

    const parts = value.trim().split(/\s+/);
    if (parts.length < 3) return false;

    const [width, style, ...colorParts] = parts;
    const color = colorParts.join(' ');

    // Validate width (basic check for length units)
    const isValidWidth = /^(\d+(\.\d+)?)(px|em|rem|%)$/.test(width);
    if (!isValidWidth) return false;

    // Validate border style
    const validStyles = [
      'none',
      'solid',
      'dashed',
      'dotted',
      'double',
      'groove',
      'ridge',
      'inset',
      'outset',
      'hidden',
    ];
    if (!validStyles.includes(style)) return false;

    // Validate color (either direct or linear-gradient)
    return !!TinyColorValidator.isColor(color) || this.#isValidLinearGradient(color);
  }

  /**
   * Sets the random changer amount.
   * @param {number} value Stop time value.
   * @returns {void}
   */
  set rdChangerAmount(value) {
    this.#rdChangerAmount = value;
  }

  /**
   * Gets the current random changer amount.
   * @returns {number} Random changer amountvalue.
   */
  get rdChangerAmount() {
    return this.#rdChangerAmount;
  }

  /**
   * Gets the current stop time.
   * @returns {number} Stop time value.
   */
  get stopTime() {
    return this.#stopTime;
  }

  /**
   * Sets the stop time.
   * @param {number} value Stop time value.
   * @returns {void}
   */
  set stopTime(value) {
    this.#stopTime = value;
  }

  /**
   * Sets the background image using a `data:` URL.
   *
   * For security reasons, only `data:` URLs are accepted by default to avoid external resource injection.
   *
   * @param {string|null} value - The background-image URL (must be a `data:` image by default).
   */
  set bgImg(value) {
    this.#bgImg =
      typeof value === 'string' && this.#isValidDataImage(value) ? value : null;
  }

  /**
   * Sets the background image using a `data:` URL or, optionally, a standard image URL if forced.
   *
   * For security reasons, only `data:` URLs are accepted by default to avoid external resource injection.
   * You can override this restriction using the `forceUnsafe` flag, but this is discouraged unless trusted.
   *
   * @param {string|null} value - The background-image URL (must be a `data:` image by default).
   * @param {boolean} [forceUnsafe=false] - Allows setting non-data URLs if true (use with caution).
   */
  setBgImg(value, forceUnsafe = false) {
    this.#bgImg =
      typeof value === 'string' && (forceUnsafe || this.#isValidDataImage(value)) ? value : null;
  }

  /**
   * Returns the currently set background image if valid, or null.
   *
   * @returns {string|null} - The current background-image value (data:image URL) or null if none is set.
   */
  get bgImg() {
    return this.#bgImg || null;
  }

  /**
   * Sets the background skin style if it's a valid CSS color or linear-gradient.
   * Prevents injection of unsafe or malformed styles.
   *
   * @param {string} skin - A valid CSS color string or gradient.
   */
  set bgSkin(skin) {
    if (typeof skin !== 'string') {
      this.#bgSkin = null;
      return;
    }

    const trimmed = skin.trim();
    const isGradient = this.#isValidLinearGradient(trimmed);
    const isColor = !!TinyColorValidator.isColor(trimmed);

    this.#bgSkin = isGradient || isColor ? trimmed : null;
  }

  /**
   * Gets the currently applied background skin.
   * @returns {string|null} The current background skin, or the default if not set.
   */
  get bgSkin() {
    return this.#bgSkin || this.#defaultBgSkin;
  }

  /**
   * Sets the text skin (style) of the dice numbers.
   * @param {string|null} skin - The skin name to apply to the text. Pass null or non-string to reset to default.
   */
  set textSkin(skin) {
    this.#textSkin = typeof skin === 'string' && !!TinyColorValidator.isColor(skin) ? skin : null;
  }

  /**
   * Gets the currently applied text skin.
   * @returns {string|null} The current text skin, or the default if not set.
   */
  get textSkin() {
    return this.#textSkin || this.#defaultTextSkin;
  }

  /**
   * Sets the border skin (style) of the dice edges.
   * @param {string|null} skin - The skin name to apply to the border. Pass null or non-string to reset to default.
   */
  set borderSkin(skin) {
    this.#borderSkin = typeof skin === 'string' && this.#isValidCssBorder(skin) ? skin : null;
  }

  /**
   * Gets the currently applied border skin.
   * @returns {string|null} The current border skin, or the default if not set.
   */
  get borderSkin() {
    return this.#borderSkin || this.#defaultBorderSkin;
  }

  /**
   * Sets the background skin for selected dice.
   * Accepts valid CSS color strings or `linear-gradient(...)`.
   * Invalid values reset the skin to `null`.
   *
   * @param {string} skin - The CSS background to apply when a die is selected.
   */
  set selectionBgSkin(skin) {
    if (typeof skin !== 'string') {
      this.#selectionBgSkin = null;
      return;
    }

    const trimmed = skin.trim();
    const isGradient = this.#isValidLinearGradient(trimmed);
    const isColor = !!TinyColorValidator.isColor(trimmed);

    this.#selectionBgSkin = isGradient || isColor ? trimmed : null;
  }

  /**
   * Gets the background skin used for selected dice.
   * Returns the custom value if set; otherwise, returns the default.
   *
   * @returns {string|null} The current background skin for selected dice.
   */
  get selectionBgSkin() {
    return this.#selectionBgSkin || this.#defaultSelectionBgSkin;
  }

  /**
   * Sets the text color for selected dice.
   * Only valid CSS color values are accepted.
   * Invalid inputs will reset the color to `null`.
   *
   * @param {string} skin - The text color for selected dice.
   */
  set selectionTextSkin(skin) {
    this.#selectionTextSkin =
      typeof skin === 'string' && !!TinyColorValidator.isColor(skin) ? skin : null;
  }

  /**
   * Gets the text color used for selected dice.
   * Returns the custom value if set; otherwise, returns the default.
   *
   * @returns {string|null} The current text color for selected dice.
   */
  get selectionTextSkin() {
    return this.#selectionTextSkin || this.#defaultSelectionTextSkin;
  }

  /**
   * Applies the current visual skin to a specific dice face element.
   * This includes background color, text color, border style, and optionally
   * a `background-image` if set via `setBgImg`.
   *
   * @param {HTMLElement} face - The HTML element representing a dice face.
   */
  #updateDiceFaceSkin(face) {
    // Skin
    face.style.background = this.bgSkin || '';
    face.style.color = this.textSkin || '';
    face.style.border = this.borderSkin || '';
    face.style.setProperty('--dice-selection-bg', this.selectionBgSkin);
    face.style.setProperty('--dice-selection-text', this.selectionTextSkin);

    // Background image
    const bgImg = this.bgImg;
    if (bgImg) {
      face.style.backgroundImage = `url("${bgImg}")`;
      face.style.backgroundPosition = 'center';
      face.style.backgroundSize = '100%';
      face.style.backgroundRepeat = 'repeat';
    }
  }

  /**
   * Updates the visual skin or style of a single dice face element.
   *
   * This is a public wrapper around the internal method `#updateDiceFaceSkin`,
   * allowing external calls to apply the dice face style dynamically.
   *
   * @param {HTMLElement} face - The DOM element representing a single face of the die.
   * @returns {void}
   */
  updateDiceFaceSkin(face) {
    return this.#updateDiceFaceSkin(face);
  }

  /**
   * Updates the visual skin of all dice face elements currently rendered.
   * Iterates through each dice in `this.#elements` and applies the active
   * background, text color, border, and background image styles using `#updateDiceFaceSkin`.
   *
   */
  updateDicesSkin() {
    for (const index in this.#elements) this.updateDiceSkin(index);
  }

  /**
   * Updates the visual skin of a specific die by index.
   * Applies current background color, text color, border style, and background image
   * to all face elements of the selected die using `#updateDiceFaceSkin`.
   *
   * @param {number|string} index - The index of the die to update.
   * @throws {Error} If the index is not a valid number or string convertible to number.
   *
   * @returns {boolean} Returns `true` if the die was found and updated; otherwise `false`.
   */
  updateDiceSkin(index) {
    const parsedIndex =
      typeof index === 'string' ? parseInt(index) : typeof index === 'number' ? index : -1;
    if (Number.isNaN(parsedIndex))
      throw new Error('updateDiceSkin: index must be a number or a numeric string.');
    const element = this.#elements[parsedIndex];

    if (element) {
      for (const index2 in element.faces) this.#updateDiceFaceSkin(element.faces[index2]);
      return true;
    } else return false;
  }

  /**
   * Generates a random integer between 1 and max (inclusive).
   * If `canZero` is true, the range becomes 0 to max (inclusive).
   *
   * @param {number} max - The maximum value for the roll (inclusive).
   * @param {boolean} [canZero=false] - Whether the result can include 0.
   * @returns {number} A random integer between 1 and max, or 0 and max if `canZero` is true. Returns 0 if max <= 0.
   */
  #rollNumber(max = 0, canZero = false) {
    // Throw an error if the value is not a valid number
    if (typeof max !== 'number' || Number.isNaN(max)) {
      throw new Error(`Invalid die max value: ${max}. All values must be positive numbers.`);
    }

    // Valid number
    if (max > 0) {
      let maxValue = max;
      let finalValue = 1;
      if (canZero) {
        maxValue++;
        finalValue--;
      }
      return Math.floor(Math.random() * maxValue) + finalValue;
    } else return 0;
  }

  /**
   * Generates a random integer between a lower bound and a maximum value.
   *
   * This is a public wrapper for the internal method `#rollNumber`, which handles
   * dice-style number generation, optionally allowing zero as a result.
   *
   * @param {number} [max=0] - The maximum value (inclusive upper bound if `canZero` is true).
   * @param {boolean} [canZero=false] - If true, the roll can return 0 (or a range starting from 0).
   * @returns {number} A pseudo-random integer within the expected range.
   *
   * - If `canZero` is false: returns a number from 1 to `max`.
   * - If `canZero` is true: returns a number from 0 to `max`.
   * - If `max <= 0`: always returns 0.
   */
  rollNumber(max = 0, canZero = false) {
    return this.#rollNumber(max, canZero);
  }

  /**
   * Parses input parameters to determine the dice configuration.
   *
   * @param {string|Array<number>} perDieValues - Optional: a comma-separated string or array of individual max values.
   * @returns {number[]} - Parsed dice configuration.
   */
  parseRollConfig(perDieValues = '') {
    // Get per die data
    return typeof perDieValues === 'string' && perDieValues.length > 0
      ? perDieValues
          .trim()
          .split(',')
          .map((raw) => {
            let val = 0;
            try {
              val = parseInt(raw.trim(), 10);
            } catch {
              val = 0;
            }
            if (typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val) && val > -1)
              return val;
            return -1;
          })
      : Array.isArray(perDieValues)
        ? perDieValues
        : [];
  }

  /**
   * Inserts a single 3D die into the DOM with animation.
   *
   * @param {number} result - The value displayed on the front face of the die.
   * @param {number} max - The maximum value for the die (used to generate other random faces).
   * @param {boolean} [canZero=false] - Whether 0 is a valid face value.
   * @param {boolean} [rollInfinity=false] - Whether the die should spin indefinitely.
   *
   * @throws {Error} If `this.diceArea` is not a valid HTMLElement.
   * @throws {Error} If `this.#createCube` is not a function.
   * @throws {Error} If cube creation fails or returns an invalid sequence.
   * @returns {PreDiceResult} - An object with the array representing the values on all six faces of the cube.
   */
  insertDiceElement(result, max, canZero, rollInfinity) {
    if (typeof HTMLElement === 'undefined' || !(this.diceArea instanceof HTMLElement))
      throw new Error('insertDiceElement: this.diceArea is not a valid HTMLElement.');

    if (typeof this.#createCube !== 'function')
      throw new Error('insertDiceElement: this.#createCube is not a valid function.');

    const { cube, sequence, stop, reRollDice, stopTimeout } = this.#createCube(
      result,
      max,
      canZero,
      rollInfinity,
    );
    if (!Array.isArray(sequence))
      throw new Error('insertDiceElement: invalid cube sequence returned.');

    this.diceArea.appendChild(cube);
    return { sequence, stop, reRollDice, stopTimeout };
  }

  /**
   * Clears all dice cubes from the display area.
   * Resets internal cube counter to avoid z-index conflicts.
   */
  clearDiceArea() {
    this.#cubeId = 0;
    if (typeof HTMLElement !== 'undefined' && this.diceArea instanceof HTMLElement)
      this.diceArea.innerHTML = '';
    this.#elements = [];
  }

  /**
   * Initializes the default cube creation function and assigns it to `this.#createCube`.
   *
   * This function builds a customizable cube with 6 animated faces, where each face is
   * assigned a unique number (avoiding duplicates when possible). The front face shows the
   * result value passed in, and the others are randomized based on the `max` value.
   *
   * @remarks
   * If `createCubeScript` was not provided to the constructor, this method sets up the default cube generator.
   *
   * @returns {void}
   *
   * @function
   */
  #insertCreateCube() {
    /**
     * @param {number} result
     * @param {number} max
     * @param {boolean} [canZero=false]
     * @param {boolean} [rollInfinity=false]
     *
     * @returns {CubeResult}
     */
    this.#createCube = (result, max, canZero = false, rollInfinity = false) => {
      // Container
      /** @type {DiceElement} */
      const diceElements = { faces: [], container: null, wrapper: null };
      const container = document.createElement('div');
      container.className = 'dice-container';
      container.style.zIndex = String(1000 + this.addCubeId()); // each dice with higher priority
      diceElements.container = container;

      // Wrapper
      const wrapper = document.createElement('div');
      wrapper.className = `cube-wrapper${rollInfinity ? ` spin-infinite` : ''}`;
      diceElements.wrapper = wrapper;

      // Get rot
      const rotX = 360 * (3 + Math.floor(Math.random() * 5));
      const rotY = 360 * (3 + Math.floor(Math.random() * 5));

      // Wrapper animation
      wrapper.style.animation = `tinyDiceSpinCubeCustom 2s ease-in-out forwards`;
      wrapper.style.setProperty('--rotX', `${rotX}deg`);
      wrapper.style.setProperty('--rotY', `${rotY}deg`);

      /**
       *  Create the cube
       * @param {boolean} [isFinal=false]
       */
      const rollDice = (isFinal = false) => {
        const sequence = [];
        const countSeq = new Set();
        const min = !canZero ? 0 : -1;

        diceElements.faces = [];
        wrapper.textContent = '';
        for (let i = 1; i <= 6; i++) {
          // Element
          const face = document.createElement('div');
          face.className = `face face${i}`;
          this.#updateDiceFaceSkin(face);

          // Ignored results
          if (i !== 1 || !isFinal) {
            let roll;
            // Normal max
            if (max > min) {
              let extraValue = min;
              let usingExtra = false;
              do {
                roll = !usingExtra ? this.#rollNumber(max, canZero) : extraValue;
                if (usingExtra || sequence.length >= max) {
                  if (extraValue >= max) {
                    extraValue = min;
                    countSeq.clear();
                  }
                  extraValue++;
                  usingExtra = true;
                }
              } while (countSeq.has(roll));
            }
            // 0 or negative max
            else roll = max;

            // Insert sequence
            if (roll < 1) roll = 0;
            sequence.push(roll);
            countSeq.add(roll);
            face.textContent = String(roll);
          }
          // The result!
          else {
            face.textContent = String(result);
            sequence.push(result);
            countSeq.add(result);
          }
          // Side added
          wrapper.appendChild(face);
          diceElements.faces.push(face);
        }
        return sequence;
      };

      // The sequence
      let sequence = rollDice();

      /** @type {NodeJS.Timeout|null} */
      let rollProgress = null;

      // Stop cube animation
      let continueAnimation = true;
      const stop = () => {
        continueAnimation = false;
        if (rollProgress) clearTimeout(rollProgress);
        rollProgress = null;
        if (wrapper) wrapper.classList.add('stopped');
        sequence = rollDice(true);
      };

      /** @type {NodeJS.Timeout|null} */
      let stopTimeout = null;
      if (!rollInfinity) stopTimeout = setTimeout(stop, this.#stopTime);

      const rdChanges = this.#stopTime / this.#rdChangerAmount;
      const continueAnim = () => {
        if (continueAnimation) rollProgress = setTimeout(continueAnim, rdChanges);
        sequence = rollDice();
      };

      // Insert the cube
      container.appendChild(wrapper);
      this.#addElement(diceElements);
      return { cube: container, sequence, stop, reRollDice: rollDice, stopTimeout };
    };
  }

  /**
   * Inserts a single die cube into the DOM using the specified configuration.
   *
   * @param {number} max - Default maximum value for dice (if no individual values are given).
   * @param {boolean} [canZero=false] - Whether 0 is a valid result.
   * @param {boolean} [rollInfinity=false] - Whether all dice should spin infinitely.
   * @returns {DiceResult} - Array with results and face sequences for each die.
   */
  rollDice(max, canZero = false, rollInfinity = undefined) {
    /** @type {DiceResult} */
    const cube = {
      reRollDice: () => [],
      stop: () => undefined,
      stopTimeout: null,
      sequence: [],
      result: this.#rollNumber(max, canZero),
    };
    if (this.#existsHtml()) {
      const data = this.insertDiceElement(cube.result, max, canZero, rollInfinity);
      cube.sequence = data.sequence;
      cube.reRollDice = data.reRollDice;
      cube.stop = data.stop;
      cube.stopTimeout = data.stopTimeout;
    }
    return cube;
  }

  /**
   * Inserts multiple dice cubes into the DOM using the specified configuration.
   *
   * @param {number[]} perDieData - Array of individual max values per die.
   * @param {boolean} [canZero=false] - Whether 0 is a valid result on any die.
   * @param {boolean} [rollInfinity=false] - Whether all dice should spin infinitely.
   * @returns {Array<DiceResult>} - Array with results and face sequences for each die.
   */
  rollDices(perDieData, canZero = false, rollInfinity = false) {
    const cubes = [];
    for (let i = 0; i < perDieData.length; i++) {
      const max = perDieData[i];
      /** @type {DiceResult} */
      const cube = {
        reRollDice: () => [],
        stop: () => undefined,
        stopTimeout: null,
        sequence: [],
        result: this.#rollNumber(max, canZero),
      };
      if (this.#existsHtml()) {
        const data = this.insertDiceElement(cube.result, max, canZero, rollInfinity);
        cube.sequence = data.sequence;
        cube.reRollDice = data.reRollDice;
        cube.stop = data.stop;
        cube.stopTimeout = data.stopTimeout;
      }
      cubes.push(cube);
    }
    return cubes;
  }

  /**
   * Rolls the dice by clearing existing cubes and inserting new ones.
   *
   * @param {string|Array<number>} perDieInput - Either a comma-separated string or array of max values per die.
   * @param {boolean} [canZero=false] - Whether 0 is a valid result.
   * @param {boolean} [rollInfinity=false] - Whether dice spin infinitely.
   * @returns {Array<DiceResult>} - Array with results and face sequences for each die.
   */
  roll(perDieInput, canZero = false, rollInfinity = false) {
    const perDieData = this.parseRollConfig(perDieInput);
    this.clearDiceArea();
    return this.rollDices(perDieData, canZero, rollInfinity);
  }

  /**
   * Checks whether the TinyDices instance has been destroyed.
   *
   * @returns {boolean} - Returns `true` if the instance was destroyed, otherwise `false`.
   */
  get destroyed() {
    return this.#destroyed;
  }

  /**
   * Completely destroys the TinyDices instance by removing DOM elements and resetting internal state.
   *
   * This method:
   * - Clears all rendered dice.
   * - Empties the base DOM elements (container, diceBase, diceArea).
   * - Resets all visual skin configurations.
   * - Nullifies DOM references.
   * - Sets an internal flag to block further usage of the instance.
   *
   * @example
   * dice.destroy(); // 💣 Cleans up everything and makes the instance unusable
   */
  destroy() {
    // Clear any dice already rendered
    this.clearDiceArea();

    // Remove container element content (optional: comment if you want to preserve it)
    if (typeof HTMLElement !== 'undefined') {
      if (this.container instanceof HTMLElement) this.container.innerHTML = '';
      if (this.#diceBase instanceof HTMLElement) this.#diceBase.innerHTML = '';
      if (this.diceArea instanceof HTMLElement) this.diceArea.innerHTML = '';
    }

    // Optionally, unset the container reference
    this.#diceBase = null;
    this.diceArea = null;
    this.container = null;

    // Reset any styles or configs (if you store them in other properties, reset them here)
    this.#defaultBgSkin = null;
    this.#defaultBorderSkin = null;
    this.#defaultSelectionTextSkin = null;
    this.#defaultSelectionBgSkin = null;
    this.#defaultTextSkin = null;
    this.#selectionBgSkin = null;
    this.#selectionTextSkin = null;
    this.#bgSkin = null;
    this.#bgImg = null;
    this.#textSkin = null;
    this.#borderSkin = null;

    // Optionally, mark as destroyed to prevent further use
    this.#destroyed = true;
  }
}

export default TinyDices;
