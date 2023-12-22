import express from "express";
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import _ from "lodash";

const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// CONNECTING A DB
mongoose.connect("mongodb://127.0.0.1:27017/todolistDB");

const itemSchema = new mongoose.Schema({
    name: String
});

const taskItem = mongoose.model('TaskItem', itemSchema);
const dummyItem = mongoose.model('DummyItem', itemSchema);

// CREATING A DEFAULT LIST
const dsa = new dummyItem({
    name: "dsa"
});

const project = new dummyItem({
    name: "project"
});

const exams = new dummyItem({
    name: "exams"
});

const defaultItems = [dsa, project, exams];

const listSchema = {
    name: String,
    items: [itemSchema]
};

const List = mongoose.model("List", listSchema);

/****************************************************************************************************************/

//GET AND POST REQUESTS  
app.get("/", (req, res) => {
    res.render("index.ejs");
});

// USER'S CUSTOM LIST
app.get("/tasks", (req, res) => {
    taskItem.find({})
        .then((foundItems) => {
            console.log('found user-inserted items.', foundItems);
            res.render("tasks.ejs", { tasks: foundItems, listTitle: "My tasks" });   //main function to render tasks
        })
        .catch((error) => {
            console.log('Error finding user-inserted items: ', error);
            res.status(500).send(error);
        });
});

// DEFAULT DUMMY LIST
app.get("/dummy", (req, res) => {
    dummyItem.find({})
        .then((foundItems) => {
            if (foundItems.length === 0) {
                dummyItem.insertMany(defaultItems)
                    .then(() => {
                        console.log('successfully saved items to itemsDB');
                        res.render("dummy.ejs", { items: defaultItems });
                    })
                    .catch((error) => {
                        console.log('Error saving items to itemsDB: ', error);
                        res.status(500).send(error);
                    });
            }
            else {
                console.log('found items.', foundItems);
                res.render("dummy.ejs", { items: foundItems });
            }
        })
        .catch((error) => {
            console.log('Error finding items: ', error);
            res.status(500).send(error);
        });
});

// creating dynamic routes using express route parameters
app.get("/:customListName", (req, res) => {
    const customListName = _.capitalize(req.params.customListName);

    List.findOne({ name: customListName })
        .then((foundList) => {
            if (!foundList) {
                // Create a new list
                const list = new List({
                    name: customListName,
                    items: defaultItems
                });

                list.save()
                    .then(() => {
                        console.log("Created new list");
                        res.redirect("/" + customListName); // Redirect to the new list
                    })
                    .catch((error) => {
                        console.log('Error creating new list: ', error);
                        res.status(500).send(error);
                    });
                console.log("list doesnt exist");
            }
            else {
                console.log('Found existing list');
                res.render("tasks.ejs", { listTitle: foundList.name, tasks: foundList.items }); // Render the existing list
            }
        })
        .catch((error) => {
            console.log('Error in findOne function: ', error);
            res.status(500).send(error);
        });
})

app.post("/submit", (req, res) => {
    const task = req.body["task"];
    const listName = req.body["listTitle"];

    const newTask = new taskItem({
        name: task
    });

    if (listName === "My tasks") {
        newTask.save()
            .then(() => {
                console.log('successfully saved new task.');
                res.redirect("/" + "tasks");
            })
            .catch((error) => {
                console.log('Error saving new task: ', error);
                res.status(500).send(error);
            });
    } else {
        List.findOne({ name: listName })
            .then((foundList) => {
                foundList.items.push(newTask);
                foundList.save()
                    .then(() => {
                        res.redirect("/" + listName);
                    })
                    .catch((error) => {
                        console.log('Error saving new task to list: ', error);
                        res.status(500).send(error);
                    });
            })
            .catch((error) => {
                console.log('Error finding list: ', error);
                res.status(500).send(error);
            });
    }
});

app.post("/delete-task", (req, res) => {
    const task = req.body["checkbox"];
    const listName = req.body["listTitle"];

    if (listName === "My tasks") {
        taskItem.findByIdAndDelete(task)
            .then(() => {
                console.log('successfully deleted task from this list.');
                res.redirect("/" + "tasks"); // Redirect back to the tasks page
            })
            .catch((error) => {
                console.log('Error deleting task: ', error);
                res.status(500).send(error);
            });
    } else {
        List.findOneAndUpdate(
            { name: listName },
            { $pull: { items: { _id: task } } }
        )
            .then((updatedList) => {
                console.log('successfully deleted task from this list.');
                res.redirect("/" + listName); // Redirect back to the list page
            })
            .catch((error) => {
                console.log('Error deleting task from list: ', error);
                res.status(500).send(error);
            });
    }
});

app.post("/delete-dummy", (req, res) => {
    const dummy = req.body["checkbox"];

    // Delete the task from the database
    dummyItem.findByIdAndDelete(dummy)
        .then(() => {
            console.log('successfully deleted dummy.');
            res.redirect("/" + "dummy"); // Redirect back to the dummy page
        })
        .catch((error) => {
            console.log('Error deleting dummy: ', error);
            res.status(500).send(error);
        });
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});