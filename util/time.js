let util = {};

// stolen from my musicapi's util.js @ https://github.com/nyx-bot/musicAPI/blob/main/util.js

util.timestampStringToNum = function (ts) {
    if(!ts.includes(`:`)) return 0;
    const tsArr = ts.split(':').reverse();
    let finalNum = 0;//sec,  min,   hour,    day,      month,      year,        5 years,      50 years,      100 years,     500 years,      1000 years
    let conversions = [1000, 60000, 3600000, 86400000, 2592000000, 31536000000, 157700000000, 1577000000000, 3154000000000, 15770000000000, 31540000000000]
    for(i in tsArr) {
         finalNum = finalNum + Number(tsArr[Number(i)]) * (conversions[Number(i)])
    };
    return (finalNum)
}

util.convertMS = function(ms) {
    if(typeof ms != `number` && isNaN(ms)) return console.l(`ms in convertms is not a number!`);
    if(typeof ms == `string`) {ms = Number(ms)}
    var obj = {infinite: 0, year: 0, month: 0, day: 0, hour: 0, minute: 0, seconds: 0, ms};
    if(ms >= 2.3652e+14) {
         obj.infinite = 1
    } else {
         while(ms >= 31540000000000) {obj.year = obj.year + 1000; ms = ms-31540000000000}
         while(ms >= 15770000000000) {obj.year = obj.year + 500; ms = ms-15770000000000}
         while(ms >= 3154000000000) {obj.year = obj.year + 100; ms = ms-3154000000000}
         while(ms >= 1577000000000) {obj.year = obj.year + 50; ms = ms-1577000000000}
         while(ms >= 157700000000) {obj.year = obj.year + 5; ms = ms-157700000000}
         while(ms >= 31536000000) {obj.year++; ms = ms-31536000000}
         while(ms >= 2592000000) {obj.month++; ms = ms-2592000000}
         while(ms >= 86400000) {obj.day++; ms = ms-86400000}
         while(ms >= 3600000) {obj.hour++; ms = ms-3600000}
         while(ms >= 60000) {obj.minute++; ms = ms-60000}
         while(ms >= 1000) {obj.seconds++; ms = ms-1000}
    }
    return obj;
}

util.timestampConvert = function (obj, allowZero) {
    if(typeof obj == "number" || typeof obj == "string") {
         let num = Number(Math.round(Number(obj) / 1000)) * 1000;
         obj = util.convertMS(num);
    } else if(typeof obj == `object` && obj.length !== undefined) {
         let num = Number(Math.round(Number(obj[0]) / 1000)) * 1000;
         obj = util.convertMS(num);
    }
    let string = null;
    if(obj.infinite) {
         string = allowZero ? `00:00` : `--:--`
    } else {
         let array = [];
         let hours = (obj.year * 8760) + (obj.month * 730) + (obj.day * 24) + obj.hour;
         if(hours < 10) {
              hours = `0${obj.hour}`;
         }
         if(hours === 0) {
              hours = `00`;
         }
         array.push(`${hours}`);
         if(obj.minute < 10) {
              obj.minute = `0${obj.minute}`;
         }
         if(obj.minute === 0) {
              obj.minute = `00`;
         }
         array.push(`${obj.minute}`);
         if(obj.seconds < 10) {
              obj.seconds = `0${obj.seconds}`;
         }
         if(obj.seconds === 0) {
              obj.seconds = `00`;
         }
         array.push(`${obj.seconds}`);
         let startAt = null;
         let checked = 0;
         array.forEach((num) => {
              if(startAt === null) {
                   if(!(num == "00") && Number(num) > 0) {
                        startAt = checked;
                   }
              }
              checked = checked + 1;
         });
         if(startAt === null) {
              return allowZero ? `00:00` : "--:--";
         }
         let numGoing = startAt;
         while (!(numGoing == array.length)) {
              if(!string) {
                   string = `${array[numGoing]}`;
              } else {
                   string = `${string}:${array[numGoing]}`;
              }
              numGoing = numGoing + 1;
         }
         if(!string) {
              return allowZero ? `00:00` : `--:--`;
         }
         if(string.length === 2) {
              string = `00:${string}`;
         }
    }

    return string;
}

let timestampStringToNum = function (ts) {
     if(!ts.includes(`:`)) return 0;
     const tsArr = ts.split(':').reverse();
     let finalNum = 0;//sec,  min,   hour,    day,      month,      year,        5 years,      50 years,      100 years,     500 years,      1000 years
     let conversions = [1000, 60000, 3600000, 86400000, 2592000000, 31536000000, 157700000000, 1577000000000, 3154000000000, 15770000000000, 31540000000000]
     for(i in tsArr) {
          finalNum = finalNum + Number(tsArr[Number(i)]) * (conversions[Number(i)])
     };
     return (finalNum)
 }
 
 let convertMS = function(ms) {
     if(typeof ms != `number` && isNaN(ms)) return console.error(`ms in convertms is not a number!`);
     if(typeof ms == `string`) {ms = Number(ms)}
     var obj = {infinite: 0, year: 0, month: 0, day: 0, hour: 0, minute: 0, seconds: 0, ms};
     if(ms >= 2.3652e+14 || ms === Infinity) {
         obj.infinite = 1
     } else {
         obj.year = Math.floor(ms/31536000000); ms = ms-(obj.year * (31536000000))
         obj.month = Math.floor(ms/2592000000); ms = ms-(obj.month * (2592000000))
         obj.day = Math.floor(ms/86400000); ms = ms-(obj.day * (86400000))
         obj.hour = Math.floor(ms/3600000); ms = ms-(obj.hour * (3600000))
         obj.minute = Math.floor(ms/60000); ms = ms-(obj.minute * (60000))
         obj.seconds = Math.floor(ms/1000); ms = ms-(obj.seconds * (1000))
     }
     return obj;
 }
 
 let timeConvert = function (obj, setting, givenLimit) {
      let limit = undefined;
      if(!isNaN(givenLimit)) {
           limit = Math.round(givenLimit);
      }
      if(typeof obj == "number" || typeof obj == "string") {
           let num = Number(Math.round(Number(obj) / 1000)) * 1000;
           obj = convertMS(num);
      };
      if(obj.infinite) {
           return (`∞`)
      } else {
           if(limit === undefined) {limit = Object.entries(obj).length-1}
           let p = {
                year: " years",
                month: " months",
                day: " days",
                hour: " hours",
                minute: " minutes",
                second: " seconds",
                yearone: " year",
                monthone: " month",
                dayone: " day",
                hourone: " hour",
                minuteone: " minute",
                secondone: " second",
           };
           if(setting) {
                p = {
                     year: "y",
                     month: "mo",
                     day: "d",
                     hour: "h",
                     minute: "m",
                     second: "s",
                     yearone: "y",
                     monthone: "mo",
                     dayone: "d",
                     hourone: "h",
                     minuteone: "m",
                     secondone: "s",
                };
           }
           let timeff = obj;
           let count = 0;
           let time = "";
           if(limit === 0) {
                return (time);
           }
           if(timeff.ms < 1000) {
                time = `0${p.second}`;
                return (time)
           } else {
                if(!(timeff.year === 0)) {
                     if(limit === 1) {
                          if(timeff.year === 1) {
                               time = `${time} and ${timeff.year}${p.yearone}`;
                          } else {
                               time = `${time} and ${timeff.year}${p.year}`;
                          }
                     } else {
                          if(count === 0) {
                               if(timeff.year === 1) {
                                    time = `${timeff.year}${p.yearone}`;
                               } else {
                                    time = `${timeff.year}${p.year}`;
                               }
                          } else {
                               if(timeff.year === 1) {
                                    time = `${time}, ${timeff.year}${p.yearone}`;
                               } else {
                                    time = `${time}, ${timeff.year}${p.year}`;
                               }
                          }
                     }
                     limit--; count++
                }; if(limit === 0) return (time);
                if(!(timeff.month === 0)) {
                     if(limit === 1) {
                          if(timeff.month === 1) {
                               time = `${time} and ${timeff.month}${p.monthone}`;
                          } else {
                               time = `${time} and ${timeff.month}${p.month}`;
                          }
                     } else {
                          if(count === 0) {
                               if(timeff.month === 1) {
                                    time = `${timeff.month}${p.monthone}`;
                               } else {
                                    time = `${timeff.month}${p.month}`;
                               }
                          } else {
                               if(timeff.month === 1) {
                                    time = `${time}, ${timeff.month}${p.monthone}`;
                               } else {
                                    time = `${time}, ${timeff.month}${p.month}`;
                               }
                          }
                     }
                     limit--; count++
                }; if(limit === 0) return (time);
                if(!(timeff.day === 0)) {
                     if(limit === 1) {
                          if(timeff.day === 1) {
                               time = `${time} and ${timeff.day}${p.dayone}`;
                          } else {
                               time = `${time} and ${timeff.day}${p.day}`;
                          }
                     } else {
                          if(count === 0) {
                               if(timeff.day === 1) {
                                    time = `${timeff.day}${p.dayone}`;
                               } else {
                                    time = `${timeff.day}${p.day}`;
                               }
                          } else {
                               if(timeff.day === 1) {
                                    time = `${time}, ${timeff.day}${p.dayone}`;
                               } else {
                                    time = `${time}, ${timeff.day}${p.day}`;
                               }
                          }
                     }
                     limit--; count++
                }; if(limit === 0) return (time);
                if(!(timeff.hour === 0)) {
                     if(limit === 1) {
                          if(timeff.hour === 1) {
                               time = `${time} and ${timeff.hour}${p.hourone}`;
                          } else {
                               time = `${time} and ${timeff.hour}${p.hour}`;
                          }
                     } else {
                          if(count === 0) {
                               if(timeff.hour === 1) {
                                    time = `${timeff.hour}${p.hourone}`;
                               } else {
                                    time = `${timeff.hour}${p.hour}`;
                               }
                          } else {
                               if(timeff.hour === 1) {
                                    time = `${time}, ${timeff.hour}${p.hourone}`;
                               } else {
                                    time = `${time}, ${timeff.hour}${p.hour}`;
                               }
                          }
                     }
                     limit--; count++
                }; if(limit === 0) return (time);
                if(!(timeff.minute === 0)) {
                     if(limit === 1) {
                          if(timeff.minute === 1) {
                               time = `${time} and ${timeff.minute}${p.minuteone}`;
                          } else {
                               time = `${time} and ${timeff.minute}${p.minute}`;
                          }
                     } else {
                          if(count === 0) {
                               if(timeff.minute === 1) {
                                    time = `${timeff.minute}${p.minuteone}`;
                               } else {
                                    time = `${timeff.minute}${p.minute}`;
                               }
                          } else {
                               if(timeff.minute === 1) {
                                    time = `${time}, ${timeff.minute}${p.minuteone}`;
                               } else {
                                    time = `${time}, ${timeff.minute}${p.minute}`;
                               }
                          }
                     }
                     limit--; count++
                }; if(limit === 0) return (time);
                if(!(timeff.seconds === 0)) {
                     if(limit === 1) {
                          if(timeff.seconds === 1) {
                               time = `${time} and ${timeff.seconds}${p.secondone}`;
                          } else {
                               time = `${time} and ${timeff.seconds}${p.second}`;
                          }
                     } else {
                          if(count === 0) {
                               if(timeff.seconds === 1) {
                                    time = `${timeff.seconds}${p.secondone}`;
                               } else {
                                    time = `${timeff.seconds}${p.second}`;
                               }
                          } else {
                               if(timeff.seconds === 1) {
                                    time = `${time}, ${timeff.seconds}${p.secondone}`;
                               } else {
                                    time = `${time}, ${timeff.seconds}${p.second}`;
                               }
                          }
                     }
                     limit--; count++
                }; return (time);
           }
      }
 };
 
 util.time = (content, shorten, {
     allowZero=false,
}={}) => {
     let returnObject = {
         timestamp: `--:--`,
         string: ``,
         units: {
             infinite: 0, 
             year: 0, 
             month: 0, 
             day: 0, 
             hour: 0, 
             minute: 0, 
             seconds: 0, 
             ms: 0
         }
     }
 
     if(typeof content == `string`) {
         if(content.includes(`:`)) {
             returnObject.units = convertMS(timestampStringToNum(content));
             returnObject.timestamp = util.timestampConvert(returnObject.units, allowZero);
             returnObject.string = timeConvert(returnObject.units, shorten ? true : false, 3);
             return returnObject;
         } else if(Number(content)) {
             returnObject.units = convertMS(Number(content))
             returnObject.timestamp = util.timestampConvert(returnObject.units, allowZero);
             returnObject.string = timeConvert(returnObject.units, shorten ? true : false, 3);
             return returnObject;
         } else return returnObject;
     } else if(typeof content == `number`) {
         returnObject.units = convertMS(content);
         returnObject.timestamp = util.timestampConvert(returnObject.units, allowZero);
         returnObject.string = timeConvert(returnObject.units, shorten ? true : false, 3);
         return returnObject;
     } else if(typeof content == `object`) {
         try {
             if(JSON.stringify(Object.keys(content).sort()) === JSON.stringify(Object.keys(returnObject.units).sort())) {
                 returnObject.units = content;
                 returnObject.timestamp = util.timestampConvert(returnObject.units);
                 returnObject.string = timeConvert(returnObject.units, shorten ? true : false, 3);
                 return returnObject;
             } else return returnObject
         } catch(e) {return returnObject;}
     } else return returnObject;
};

module.exports = util.time;