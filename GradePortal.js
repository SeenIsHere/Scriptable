module.exports = { run: async () => {
  //Version: 2.0.0
  const [USER, PASS, NAME] = args.widgetParameter.split(" ");
  var htmlparser = importModule("HTMLParser");
  const parse = htmlparser.parse;

  const headers = {
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "accept-language": "en-US,en;q=0.9,it;q=0.8",
    "cache-control": "max-age=0",
    "sec-ch-ua": "\"Google Chrome\";v=\"111\", \"Not(A:Brand\";v=\"8\", \"Chromium\";v=\"111\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "sec-fetch-site": "same-origin",
    "sec-fetch-user": "?1",
    "upgrade-insecure-requests": "1",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Referer": "https://www.fridaystudentportal.com/portal/index.cfm?f=gradebook.cfm"
  };

  class GradePortal {
    constructor(username, password){
      this.username = username
      this.password = password
    };

    async set_year(cookie, year){
      const { username } = this;

      var req = new Request("https://www.fridaystudentportal.com/portal/security/sqlChangeYear.cfm");

      req.headers = {
          ...headers,
          "content-type": "application/x-www-form-urlencoded",
          "cookie": cookie
      };
      req.body = "changeYearTo=" + year + "&addressID=0&studentID=" + username + "&locationID=010+";
      req.method = "POST";

      var content = await req.loadString();

      return content;
    }

    async get_courses(cookie, mp){

      if(mp && (mp<1 || mp>4)) throw new Error("Invalid Marking Period Value");

        var options = mp ? ({
          "headers": { 
            ...headers,
            "content-type": "application/x-www-form-urlencoded",
            "cookie": cookie,
          },
          "body": "selectMP=" + mp,
          "method": "POST"
        }) : ({
          "headers": { ...headers, "cookie": cookie },
          "body": null,
          "method": "GET"
        });

      var req = new Request("https://www.fridaystudentportal.com/portal/index.cfm?f=gradebook.cfm");

      req.headers = options.headers;
      req.body = options.body;
      req.method = options.method;

      var content = await req.loadString();

      return parse(content).querySelectorAll("tbody > tr").map(row => {
        var columns = row.querySelectorAll("td");
        return [
          columns[0].querySelector("a"),
          columns[1],
          columns[2].querySelector("a")
        ].map(tag => tag.text.replace(/\n/g, ""));

      }).map(set => {
        var [classname, grade, teachers] = set;

        classname = classname.trim();

        classname = classname.toLowerCase().includes("lunch") ? classname.slice(0, classname.lastIndexOf(" ")) : classname;
        classname = classname.split(" - ").filter(x => x !== "CP")[0];
        classname = classname.split(" ").filter(x => {
          x = x.toLowerCase();
          return (x !== "honors") && (x !== "ap") && (x !== "de") && (x !== "i") && (x !== "ii") && (x !== "iii") && (x !== "iv") && (x !== "v")
        }).join(" ");

        grade = grade.slice(0, grade.indexOf("/")).trim();

        let floatGrade = parseFloat(grade);
        let letterGrade = "";

        if(floatGrade >= 92.5) letterGrade = "A";
        else if(floatGrade >= 84.5) letterGrade = "B";
        else if(floatGrade >= 75.5) letterGrade = "C";
        else if(floatGrade >= 69.5) letterGrade = "D";
        else letterGrade = "F";

        if(grade == "") grade="N/A";
        else grade = grade + " | " + letterGrade;



        teachers = teachers.split("\n").filter(value => value !== "").map(x => x.trim());

        return { classname, grade, teachers };
      })
      .filter(({ grade }) => grade !== "");

    }

    async verify_get_cookie(){
      const { username, password } = this;

      var req = new Request("https://fridaystudentportal.com/portal/security/login.cfm");

      req.headers = { "cookie": "DISTRICTID=ACITECH;" };

      await req.load();



      var req_cookies = [
        "CFCLIENT_PARENTPORTAL=mod%5Fnotificationcontactmaintenance%3D0%23loggedin%3Dtrue%23username%3D" + username + "%23mod%5Fgradebookuseskills%3D0%23usealtlanguage1%3D0%23locationid%3D010%20%23realitemployee%3D0%23yearid%3D2022%23transcriptlocation%3D%2F%2F10%2E78%2E42%2E1%2FC52317%5FH63298%5Fnas1%23mainserverdomain%3Dhttps%3A%2F%2Fsecure%2Efridaysis%2Ecom%23limityearid%3D2022%23originaladdressidloggedin%3D0%23shareddbpath%3DSharedAbseconACITech%2Edbo%2E%23fileserverdomain%3Dhttps%3A%2F%2Fmedia%2Efridaysis%2Ecom%23districtid%3DACITECH%23mod%5Fcafeteriaonlineorders%3D0%23dbname%3DACITECH%23mod%5Fbli%3D1%23fileserverlocation%3D%2F%2F65%2E36%2E243%2E230%23iepdocumentlocation%3D%2F%2F10%2E78%2E42%2E1%2FC52317%5FH63298%5Fnas1%23ieponly%3D0%23getyear%3D2022%23parentportalpassword%3D" + encodeURIComponent(password) + "%23addressid%3D0%23parentportalcode%3D0%23requireportalcode%3D0%23studentid%3D" + username.slice(4) + "%23defaultmarkingperiod%3D4%23mainserverip%3D65%2E36%2E243%2E158%23",
        "DISTRICTID=ACITECH",
        "PARENTPORTALCODE=\"\"",
        "PARENTPORTALUSERNAME=\"\""
      ];

       req.response.cookies.forEach(({ name, value }) => {
        if(["JSESSIONID", "__cf_bm", "Realtimecookie"].includes(name)){
          req_cookies.push(name + "=" + value)
        }
       });


      var cookie = req_cookies.join("; ") + ";";

      var final_req = new Request("https://www.fridaystudentportal.com/portal/security/validateStudent.cfm");

      final_req.headers = { 
        ...headers,
        "content-type": "application/x-www-form-urlencoded",
        "cookie": cookie,
      };

      final_req.body = "username=" + username + "&password=" + encodeURIComponent(password);

      final_req.method = "POST";

      await final_req.load();

      return cookie;
    }
  };



  var portal = new GradePortal(USER, PASS);
  var cookie = await portal.verify_get_cookie();
  var courses = await portal.get_courses(cookie);
  var data = courses.map(x => x.classname + ": " + x.grade).join("\n");
  var last_updated = new Date();

  console.log(data);

  let title = NAME + "'s Grades";
  let widget = new ListWidget();

  widget.backgroundColor = Color.dynamic(Color.white(), Color.blue());

  let titleStack = widget.addStack();
  let titleField = titleStack.addText(title);
      titleField.textColor = Color.dynamic(Color.black(), Color.white());
      titleField.textOpacity = 0.7;
      titleField.font = Font.mediumSystemFont(13);

  widget.addSpacer(12);

  let desc = widget.addText(data);
      desc.minimumScaleFactor = 0.5;
      desc.textColor = Color.dynamic(Color.black(), Color.white());
      desc.font = Font.semiboldSystemFont(16);

  widget.addSpacer(8);
  
    const updatedTime = widget.addDate(last_updated)
  updatedTime.applyRelativeStyle()
  updatedTime.textColor = Color.white();
  updatedTime.textOpacity = 0.7;
  updatedTime.font = Font.systemFont(7);


  widget.presentMedium()
  Script.setWidget(widget);
  Script.complete();
  //added
} }
