import mongoose from "mongoose";

const {Schema, model} = mongoose;

const branchSchema = Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    subdomain: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    customDomain: {
        type: String,
        default: "bellezaschool.com",
    },
});

const Branch = new model("Branch", branchSchema);

export default Branch;