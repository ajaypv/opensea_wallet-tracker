import axios from "axios";
import express from "express";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set , get, onValue,update, remove,} from "firebase/database"; 
import { getAuth, signInWithEmailAndPassword} from "firebase/auth";
import dotenv from 'dotenv'
import twilio from 'twilio'
dotenv.config()

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio(accountSid, authToken);

const firebaseConfig = {
    apiKey: "AIzaSyDgjkAFksGTqCUbA4R9m9UAMFM1Cy8MZMw",
    authDomain: "namekujilabs.firebaseapp.com",
    projectId: "namekujilabs",
    storageBucket: "namekujilabs.appspot.com",
    messagingSenderId: "527914262266",
    appId: "1:527914262266:web:b43975b52373a2b3467343",
    measurementId: "G-55B1F2E0LM"
  };

const fire = initializeApp(firebaseConfig);
const app = express()

const auth = getAuth();
signInWithEmailAndPassword(auth, "namesujiserver@gmail.com", "namekuji")
.then((userCredential) => {
})
.catch((error) => {
});

async function sendMessage(WhatsappNumber,walletName,Tra,TransactionPrice,collection,symbol,image){
    try{
    client.messages 
      .create({ 
         body:`
Wallet :   ${walletName}
Activity Type:  ${Tra}
Collection:   ${collection}
Price:    ${TransactionPrice} ${symbol}`, 

         from: 'whatsapp:+16184271719',       
         to: `whatsapp:${WhatsappNumber}` ,
         mediaUrl :image, 
       }) 
      .then(message => console.log(message.sid)) 
      .done();

    }catch(error){
        console.log(error)

    }
    
}


async function openseaResponse(wallet_id,childkey){
    try {
      const walletUrl = `https://api.etherscan.io/api?module=account&action=tokennfttx&address=${wallet_id}&page=1&offset=100&startblock=0&endblock=27025780&sort=asc&apikey=9CZD5SDGEGH921YDHAAQ4YRMT3HRMQC5Z7`
      const ContractAdressResponse = await axios.get(walletUrl)
      const openseaCon = ContractAdressResponse["data"]["result"][0]["contractAddress"];
  
      const url =`https://api.opensea.io/api/v1/asset/${openseaCon}/1/`
      const response = await axios.get(url,{ 'headers': { "Accept": "application/json",
      "X-API-KEY": "0e090a5d0169429c9c96839dc9b24ec5" } })
      const image  =response["data"]["image_url"]
      const collection = response["data"]["asset_contract"]["name"]
      const symbol =response["data"]["last_sale"]["payment_token"]["symbol"]
      const TransactionType = response["data"]["last_sale"]["event_type"];
              let Tra =""
              if(TransactionType == "successful"){
                Tra = "Sale"
              }
              if(TransactionType == "cancelled"){
                Tra = "Canceled Auction"
              }
      const TransactionPrice = response["data"]["collection"]["payment_tokens"][0]["eth_price"]
    const db = getDatabase();

    get(ref(db, 'openseawallet/' + childkey )).then(async (snapshot) => {
        if (snapshot.exists()) {
          const imageurl  = snapshot.val().imageurl;
          const whatsapp =snapshot.val().whatsapp.replace(/\s+/g,"");
          const walletName = snapshot.val().walletName
          if(imageurl != image){       
            await update(ref(db, 'openseawallet/' + childkey ) ,{imageurl :image});
            await sendMessage(whatsapp,walletName,TransactionType,TransactionPrice,collection,symbol,image);
          }else{
          }

        } else {
          console.log("No data available");
        }
      }).catch((error) => {
        console.error(error);
      });
    }catch(error){
        console.log(error)
    }
   
}

async function Opensea(){
    try{
    const db = getDatabase();
        const users12 = ref(db, 'openseawallet' );
        onValue(users12, (snapshot) => {
          snapshot.forEach(async (childSnapshot) => {
            const childKey = childSnapshot.key;
            const childData = childSnapshot.val();
            let t1 = new Date(childData.createdDate)
            let t2 = new Date()
            const diffInMs = Math.abs(t2- t1);
            let d1 = diffInMs/(1000 * 60 * 60 * 24);
            console.log(d1)
            if (d1 >=1){
              await remove(ref(db, 'openseawallet/' + childKey))
            }
            else{
               await openseaResponse(childData.wallet_id,childKey);  
            }
          });
        },
        {
        onlyOnce: true
        }
        
        )
    }catch(err){
        console.log(err)
    }
         
  }
  

const interval_calling = setInterval(Opensea,9000)

const port = 5000
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
