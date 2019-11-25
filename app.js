var express = require("express");
var app = express();

/**
 * Static folders and directories to be used
 */

app.use('/', express.static(__dirname + '/www'));
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/js', express.static(__dirname + '/node_modules/jquery/dist'));
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/images', express.static(__dirname + '/images'))
app.use('/css', express.static(__dirname + '/css'))

var bodyParser = require("body-parser");
var flash = require("connect-flash");
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.locals.moment = require('moment');
var mongoose = require("mongoose");
var passport = require("passport");

var LocalStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
methodOverride = require("method-override");
expressSanitizer = require("express-sanitizer");

app.set("view engine", "ejs");
app.use(methodOverride("_method"));
app.use(expressSanitizer());
app.use(flash());
var ObjectId = require('mongodb').ObjectId;

/**
 * Encoding password for users
 */

app.use(require("express-session")({
    secret: "this app belongs to aarush",
    resave: false,
    saveUninitialized: false
}));

/**
 * Response Messages via flash
 */

app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    res.locals.warning = req.flash("warning");
    next();
})

/**
 * Mongo Connection
 */

mongoose.connect("mongodb+srv://aarushg94:aarushgpassword@socialwebapp-bo1nb.mongodb.net/test?retryWrites=true&w=majority", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

var conn = mongoose.connection;

/**
 * Schema setup for User
 */

var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
}, {
    versionKey: false
});

UserSchema.plugin(passportLocalMongoose);
var User = mongoose.model("User", UserSchema);

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function (req, res, next) {
    res.locals.currentUser = req.user;
    next();
})

/**
 * Schema for upVotes
 */

var upVoteSchema = new mongoose.Schema({
    ucount: Number,
    createdAt: {type: Date, default: Date.now()},
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
}, {
    versionKey: false
});

var UpVote = mongoose.model("Upvote", upVoteSchema);

/**
 * Schema for likes
 */

var likeSchema = new mongoose.Schema({
    lcount: Number,
    createdAt: {type: Date, default: Date.now()},
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
}, {
    versionKey: false
});

var Like = mongoose.model("Like", likeSchema);

/**
 * Schema setup for recipes
 */

var recipeSchema = new mongoose.Schema({
    recipeName: String,
    recipeURL: String,
    recipeInstructions: String,
    createdAt: {type: Date, default: Date.now()},
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment"
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }],
    upvotes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }]
}, {
    versionKey: false
});

var Recipe = mongoose.model("Recipe", recipeSchema, "recipesDetails");

/**
 * Schema setup for comments
 */

var commentSchema = new mongoose.Schema({
    text: String,
    createdAt: {type: Date, default: Date.now()},
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
}, {
    versionKey: false
});

var Comment = mongoose.model("Comment", commentSchema);

/**
 * Landing page for the application
 */

app.get("/", function (req, res) {
    User.find({}, function (error, users) {
        if (error) {
            console.log(error);
        } else {
            Comment.find({}, function (error, comments) {
                if (error) {
                    console.log(error);
                } else {
                    Recipe.find({}, function (error, recipes) {
                        if (error) {
                            console.log(error)
                        } else {
                            res.render("landing", {users: users, comments: comments, recipes: recipes});
                        }
                    })
                }
            })
        }
    });
})

/**
 * Add a new recipe route
 */

app.post("/recipes", isLoggedIn, function (req, res) {
    var recipename = req.body.recipeName;
    var recipeURL = req.body.recipeURL;
    var recipeInstructions = req.body.recipeInstructions;
    var author = {
        id: req.user._id,
        username: req.user.username
    }
    var newRecipe = {
        recipeName: recipename,
        recipeURL: recipeURL,
        recipeInstructions: recipeInstructions,
        author: author
    };
    Recipe.create(newRecipe, function (err, Recipe) {
        if (err) {
            console.log(err);
        } else {
            req.flash("success", "New Recipe Added")
            res.redirect("/recipes");
        }
    })
});

/**
 * Add a new recipe form route
 */

app.get("/recipes/new", isLoggedIn, function (req, res) {
    res.render("addrecipe");
})

/**
 * Route to get all recipes
 */

app.get("/recipes", function (req, res) {
    var mysort = {likes: -1};
    Recipe.find().populate("comments likes").exec(function (err, result) {
        // console.log(result);
        // console.log(result[5].author.username);
        if (req.query.search) {
            const regex = new RegExp(escapeRegex(req.query.search), 'gi');
            Recipe.find({$or: [{recipeName: regex}, {recipeInstructions: regex}]}, function (error, recipes) {
                if (error) {
                    console.log(error);
                } else {
                    if (recipes.length > 0) {
                        res.render("recipes", {recipes: recipes});
                    } else {
                        res.render("recipes", {recipes: recipes});
                    }
                }
            }).sort(mysort);
        } else {
            Recipe.find({}, function (error, recipes) {
                if (error) {
                    console.log(error);
                } else {
                    res.render("recipes", {recipes: recipes});
                }
            });
        }
    })
});

/**
 * Details of a recipe
 */

app.get("/recipes/:id", function (req, res) {
    Recipe.findById(req.params.id).populate("comments likes").exec(function (err, result) {
        if (err) {
            console.log(err);
        } else {
            res.render("recipedetails", {result: result});
        }
    });
});

/**
 * Edit Recipe
 */

app.get("/recipes/:id/edit", checkRecipeOwner, function (req, res) {
    var id = req.params.id;
    conn.collection("recipesDetails").find({'_id': ObjectId(id)}).toArray(function (err, result) {
        res.render("editrecipe", {result: result});
    });
})

/**
 * Put for Edit Recipe
 */

app.put("/recipes/:id", isLoggedIn, function (req, res) {
    Recipe.findByIdAndUpdate(req.params.id, req.body.recipe, function (err, update) {
        if (err) {
            res.redirect("/recipes")
        } else {
            req.flash("success", "Recipe has been updated")
            res.redirect("/recipes/" + req.params.id);
        }
    })
});

/**
 * Delete recipes
 */

app.delete("/recipes/:id", checkRecipeOwner, function (req, res) {
    var id = req.params.id;
    Recipe.deleteOne({'_id': ObjectId(id)}, function (error, result) {
        if (error) {
            res.redirect("/recipes");
        } else {
            req.flash("success", "Recipe is successfully deleted")
            res.redirect("/recipes");
        }
    });
})

/**
 * Add new comment
 */

app.get("/recipes/:id/comments/new", isLoggedIn, function (req, res) {
    Recipe.findById(req.params.id, function (err, result) {
        if (err) {
            console.log(err);
        } else {
            res.render("newcomment", {result: result});
        }
    });
})

app.post("/recipes/:id/comments", isLoggedIn, function (req, res) {
    Recipe.findById(req.params.id, function (err, result) {
        if (err) {
            console.log(err)
            res.redirect("/recipes")
        } else {
            Comment.create(req.body, function (err, comment) {
                if (err) {
                    console.log(err)
                } else {
                    comment.author.id = req.user._id;
                    comment.author.username = req.user.username;
                    comment.save();
                    result.comments.push(comment);
                    result.save();
                    req.flash("success", "Tag added successfully")
                    res.redirect("/recipes/" + req.params.id);
                }
            });
        }
    });
})

/**
 * Auth - Login Page
 */

app.get("/login", function (req, res) {
    res.render("login");
})

app.post("/login", passport.authenticate("local",
    {
        successRedirect: "/recipes",
        failureRedirect: "/login"
    }), function (req, res) {
});

/**
 * Auth - Registration page
 */

app.get("/register", function (req, res) {
    res.render("register");
})

app.post("/register", function (req, res) {
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function (err, user) {
        if (err) {
            req.flash("error", "A user by that username already exists");
            return res.render("register")
        }
        passport.authenticate("local")(req, res, function () {
            req.flash("success", "Registration successful, Welcome to Social Web 2.0")
            res.redirect("/recipes");
        });
    });
});

/**
 * Auth - Logout page
 */

app.get("/logout", function (req, res) {
    req.logout();
    req.flash("success", "You are logged out now!");
    res.redirect("/recipes");
})

/**
 * Middleware
 */

function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    } else {
        req.flash("error", "Please login first");
        res.redirect("/login");
    }
}

/**
 * Editing Comments
 */

app.get("/recipes/:id/comments/:comment_id/edit", checkCommentOwner, function (req, res) {
    Comment.findById(req.params.comment_id, function (err, foundComment) {
        if (err) {
            res.redirect("back");
        } else {
            res.render("editcomment", {recipe_id: req.params.id, comment: foundComment});
        }
    })
})

/**
 * Updating comments after editing
 */

app.put("/recipes/:id/comments/:comment_id", function (req, res) {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function (err, updatedComment) {
        if (err) {
            res.redirect("back");
        } else {
            req.flash("success", "Comment has been updated")
            res.redirect("/recipes/" + req.params.id);
        }
    })
})

/**
 * Delete Comments
 */

app.delete("/recipes/:id/comments/:comment_id", checkCommentOwner, function (req, res) {
    Comment.findByIdAndRemove(req.params.comment_id, function (err) {
        if (err) {
            res.redirect("back");
        } else {
            req.flash("success", "Comment is successfully deleted")
            res.redirect("/recipes/" + req.params.id);
        }
    });
})

/**
 * Check Recipe Ownership
 */

function checkRecipeOwner(req, res, next) {
    var id = req.params.id;
    if (req.isAuthenticated()) {
        conn.collection("recipesDetails").find({'_id': ObjectId(id)}).toArray(function (err, result) {
            if (err) {
                req.flash("error", "Recipe not found")
                res.redirect("back");
            } else {
                if (result[0].author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission")
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "Please login")
        res.redirect("back");
    }
}

/**
 * Check comment Ownership
 */

function checkCommentOwner(req, res, next) {
    if (req.isAuthenticated()) {
        Comment.findById(req.params.comment_id, function (err, foundComment) {
            if (err) {
                res.redirect("back");
            } else {
                if (foundComment.author.id.equals(req.user._id)) {
                    next();
                } else {
                    res.redirect("back");
                }
            }
        });
    } else {
        res.redirect("back");
    }
}

/**
 * User Profile
 */

app.get("/dashboard", isLoggedIn, function (req, res) {
    User.find({}, function (error, users) {
        if (error) {
            console.log(error);
        } else {
            Comment.find({}, function (error, comments) {
                if (error) {
                    console.log(error);
                } else {
                    Recipe.find({}, function (error, recipes) {
                        if (error) {
                            console.log(error)
                        } else {
                            res.render("dashboard", {users: users, comments: comments, recipes: recipes});
                        }
                    })
                }
            })
        }
    });
})

/**
 * Like Recipe
 */

app.post("/recipes/:id/liked", function (req, res) {
    Recipe.findByIdAndUpdate(req.params.id, {$inc: {likes: 1}}, function (err, update) {
        if (err) {
            res.redirect("/recipes")
        } else {
            req.flash("success", "You have liked this recipe")
            res.redirect("/recipes/" + req.params.id);
        }
    })
})

/**
 * Upvote recipe
 */

app.post("/recipes/:id/upvoted", function (req, res) {
    Recipe.findByIdAndUpdate(req.params.id, {$inc: {upvotes: 1}}, function (err, update) {
        if (err) {
            res.redirect("/recipes")
        } else {
            req.flash("success", "You have upvoted this recipe")
            res.redirect("/recipes/" + req.params.id);
        }
    })
})

/**
 * Add a new like
 */

app.post("/recipes/:id/like", isLoggedIn, function (req, res) {
    Recipe.findById(req.params.id, function (err, recipes) {
        if (err) {
            console.log(err);
            res.redirect("/recipes");
        } else {
            recipes.likes.push(req.user);
            recipes.save(function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/recipes");
                }
                return res.redirect("/recipes/" + recipes._id);
            })
        }
    });
})

/**
 * Add a new upvote
 */

app.post("/recipes/:id/upvote", isLoggedIn, function (req, res) {
    Recipe.findById(req.params.id, function (err, recipes) {
        if (err) {
            console.log(err);
            res.redirect("/recipes");
        } else {
            recipes.upvotes.push(req.user);
            recipes.save(function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/recipes");
                }
                return res.redirect("/recipes/" + recipes._id);
            })
        }
    });
})

/**
 * Fuzzy searching with MongoDB
 * Source --> https://stackoverflow.com/questions/38421664/fuzzy-searching-with-mongodb
 * @param text
 * @returns {void | string}
 */

function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

/**
 * App listening port
 */

app.listen(process.env.PORT || 3000, function () {
    console.log("Social Web server started")
})