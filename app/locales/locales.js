// Before these lines define and include some sort of i18n framework 
// OR an ultra simple object that handles translation. 
var translations = {  
  en: require('en.json'),
  fr: require('fr.json'),
  nl: require('nl.json'),
  ar: require('ar.json')
};

// Then inject the translations var into the predefined translation
// service under the namespace of the CURRENT COMPONENT.     
// var translations = {  
//   COMPONENT_NAME: translations, 
//   ...        
// };    
