const BASEURL = "https://raw.githubusercontent.com/SeenIsHere/Scriptable/beta-gpa/";

//Worked!

let files = [
{
name: "gpmaim",
url: BASEURL + "/GradePortal.js"
},
{
name: "HTMLParser",
url: BASEURL + "/HTMLParser.js"
}
];

for(let file of files){
let main = new Request(file.url);
let mainFileStr = await main.loadString();
const dir = FileManager.iCloud().documentsDirectory();
FileManager.iCloud().writeString(dir + "/" + file.name + ".js", mainFileStr);
}

let { run } = importModule(files[0].name)
run()
