const DEFAULT_KEY = "5fbeb4b2da88957";
const SAVE_INTERVAL = 5000;

let files = null;
let currentIndex = 0;

async function onDirectorySelect(input) {
	files = input.files;
	if (files.length > 0) {
		await selectFile(0);
	}
}

async function selectFile(index) {
	if (!files?.item(index)) return;
	const file = files[index];
	currentIndex = index;

	// Load image data.
	const reader = new FileReader();
	reader.onload = (event) => loadFile(file, event.target.result);
	reader.readAsDataURL(file);
}

async function previousFile() {
	await selectFile(currentIndex - 1);
}

async function nextFile() {
	await selectFile(currentIndex + 1);
}

async function loadFile(file, data) {
	// Show file name and image.
	document.querySelector("#name").innerHTML = file.name;
	const image = document.querySelector("#image");
	image.src = data;

	// Reset image.
	const target = document.querySelector("#scan");
	const boxes = document.querySelector("#boxes");
	boxes.innerHTML = "";

	// Populate image.
	await image.decode();
	const scan = await scanFile(file, data);
	const lines = scan["TextOverlay"]["Lines"];
	for (let i = 0; i < lines.length; i++) {
		const box = document.createElement("a");
		box.onclick = () => target.textContent = lines[i]["LineText"];
		Object.assign(box.style, boxRatios(image, lines[i]["Words"]));

		box.id = `box-${i}`;
		box.href = `#${box.id}`;
		box.classList.add("box");
		box.tabIndex = 0;
		boxes.append(box);
	}
}

function boxRatios(image, words) {
	const bounds = boxBounds(words);
	const top = percent(bounds.top / image.naturalHeight);
	const left = percent(bounds.left / image.naturalWidth);
	const height = percent(bounds.height / image.naturalHeight);
	const width = percent(bounds.width / image.naturalWidth);
	return {top, left, height, width};
}

function percent(number) {
	return `${number * 100}%`;
}

function boxBounds(words) {
	const top = Math.min(...words.map(x => x["Top"]));
	const left = Math.min(...words.map(x => x["Left"]));
	const bottom = Math.max(...words.map(x => x["Top"] + x["Height"]));
	const right = Math.max(...words.map(x => x["Left"] + x["Width"]));
	return {top, left, height: bottom - top, width: right - left};
}

async function scanFile(file, data) {
	const key = sha1(data);
	const scan = window.localStorage.getItem(key);
	if (scan) return JSON.parse(scan);

	const response = await scanFileRequest(file);
	window.localStorage.setItem(key, JSON.stringify(response));
	return response;
}

async function scanFileRequest(file) {
	const body = new FormData();
	body.append("file", file);
	body.append("language", "jpn");
	body.append("isOverlayRequired", "True");
	body.append("apikey", recognitionKey());

	const target = "https://api.ocr.space/parse/image";
	const response = await fetch(target, {body, method: "POST"});
	return (await response.json())["ParsedResults"][0];
}

function recognitionKey() {
	const key = window.localStorage.getItem("key");
	return key ? key : DEFAULT_KEY;
}

function promptKey() {
	const key = prompt("Image recognition key:");
	if (key) window.localStorage.setItem("key", key);
}

function registerSave() {
	const element = document.querySelector("#translation");
	const save = () => window.localStorage.setItem("translation", element.value);
	element.value = window.localStorage.getItem("translation");
	setInterval(save, SAVE_INTERVAL);
}

hotkeys("left", previousFile);
hotkeys("right", nextFile);
registerSave();
