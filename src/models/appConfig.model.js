import mongoose from "mongoose";

const {Schema} =  mongoose;

const appconfigSchema = new mongoose.Schema(
  {
    appName: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    companyAddress: [
      {
        address: String,
        googleMapLocation: String,
      },
    ],
    facebookLink: {
      type: String,
      required: false,
    },
    instagramLink: {
      type: String,
      required: false,
    },
    twitterLink: {
      type: String,
      required: false,
    },
    youtubeLink: {
      type: String,
      required: false,
    },
    whatsAppLink: {
      type: String,
      required: false,
    },
    googleFormLink: {
      type: String,
      required: false,
    },
    linkedinLink: {
      type: String,
      required: false,
    },
    googleAppStoreLink: {
      type: String,
      required: false,
    },
    appleAppStoreLink: {
      type: String,
      required: false,
    },

    // Branch Link
    branchId: {
      type: Schema.Types.ObjectId,
      ref: "Branch",
      required: true, 
    }
  },
  {
    timestamps: true,
  }
);

const appConfig = mongoose.model("appConfig", appconfigSchema);
export default appConfig;
