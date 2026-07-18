const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
  cloud_name: 'dv7w1z8si', 
  api_key: '983972251958653', 
  api_secret: '8xGOEmGimfKV45V3zgs16lSb35c' 
});

async function uploadImages() {
  try {
    const res1 = await cloudinary.uploader.upload('c:\\Users\\chinh\\Documents\\eduMapBE\\be\\src\\assets\\rule_season_1.png', { folder: 'badminton' });
    console.log('Rule Season 1 URL:', res1.secure_url);

    const res2 = await cloudinary.uploader.upload('c:\\Users\\chinh\\Documents\\eduMapBE\\be\\src\\assets\\champion_img.jfif', { folder: 'badminton' });
    console.log('Champion Img URL:', res2.secure_url);
  } catch (error) {
    console.error('Error uploading images:', error);
  }
}

uploadImages();
