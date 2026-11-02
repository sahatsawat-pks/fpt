/*
- ============================================
-  CONFIG - สุดยอดแฟนพันธุ์แห่งปี 2026
- ============================================
 *
-  แก้ไขข้อมูลด้านล่างเพื่อกำหนดคำถามและคำตอบ
-  สำหรับแต่ละหมวดของเกม
 *
 */

const GAME_CONFIG = {
    "threeSecondsHeaders": [
        "นี่คือตัวละครที่มีชื่อว่าอะไร",
        "นี่คือคุณสมบัติของตัวละครที่มีชื่อว่าอะไร",
        "นี่คือภาพจากคดีที่มีชื่อว่าอะไร"
    ],
    "threeSeconds": [
        {
            "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
            "image": "public/img/01.png",
            "audio": null,
            "video": null,
            "answer": "โมริ โคโกโร่"
        },
        {
            "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
            "image": "public/img/02.png",
            "audio": null,
            "video": null,
            "answer": "โมริ รัน"
        },
        {
            "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
            "image": "public/img/03.png",
            "audio": null,
            "video": null,
            "answer": "คิซากิ เอริ"
        },
        {
            "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
            "image": "public/img/04.png",
            "audio": null,
            "video": null,
            "answer": "รัม"
        },
        {
            "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
            "image": "public/img/05.png",
            "audio": null,
            "video": null,
            "answer": "ซึบุรายะ มิซึฮิโกะ"
        },
        {
            "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
            "image": "public/img/06.png",
            "audio": null,
            "video": null,
            "answer": "นากาโมริ กินโซ"
        },
        {
            "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
            "image": "public/img/07.png",
            "audio": null,
            "video": null,
            "answer": "เคียวโงคุ มาโคโตะ"
        },
        {
            "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
            "image": "public/img/08.png",
            "audio": null,
            "video": null,
            "answer": "เคียนติ"
        },
        {
            "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
            "image": "public/img/09.png",
            "audio": null,
            "video": null,
            "answer": "มิยาโมโตะ ยูมิ"
        },
        {
            "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
            "image": "public/img/10.png",
            "audio": null,
            "video": null,
            "answer": "ฮัตโตริ เฮย์จิ"
        },
        {
            "question": "คู่ปรับตลอดกาลของโคนัน ผู้มีฉายาว่า \"1412\"",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "จอมโจรคิด (คุโรบะ ไคโตะ)"
        },
        {
            "question": "นักประดิษฐ์ข้างบ้านคุโด้ ผู้สร้างอุปกรณ์อัจฉริยะมามากล้น",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "อากาสะ ฮิโรชิ"
        },
        {
            "question": "สมาชิกขององค์กรชุดดำ ที่ดวงสุดซวย หยิบกระเป๋าผิดไปโดนระเบิดตาย",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "Tequila (เตกีล่า)"
        },
        {
            "question": "เจ้าหน้าที่ FBI ที่ต้องหนีหัวซุกหัวซุน จนต้องโกนหัวเพื่อหนีจากองค์กรชุดดำ",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "อังเดร คาเมล"
        },
        {
            "question": "เจ้าหนุ่มจอมซุ่มซ่าม ที่ทั้งพ่อและพี่ เป็นคนจากสำนักข่าวกองกลางทั้งคู่",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "ฮอนโด เอย์ซูเกะ"
        },
        {
            "question": "ตัวละครเพียงตัวเดียวในเรื่อง ที่มีชื่อ-นามสกุลตรงกับชื่อนักพากย์ญี่ปุ่นเป๊ะ ๆ",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "ทาคางิ วาตารุ"
        },
        {
            "question": "1 ในขบวนการนักสืบเยาวชน ที่มีนักพากย์เดียวกับทาคางิ วาตารุ",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "โคจิมะ เก็นตะ"
        },
        {
            "question": "สมาชิกองค์กรชุดดำที่ปรากฎตัวครั้งแรกในเดอะมูฟวี่ 26 แล้วก็ตายในภาคเดียวกัน",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "Pinga (ปิงก้า)"
        },
        {
            "question": "ฆาตกรผู้เปลี่ยนความคิดโคนันไปตลอดกาล จากการโดนไล่ต้อน สู่การฆ่าตัวตายพร้อมเปียโนใต้แสงจันทร์",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "อาซาอิ นารูมิ / อาโซ่ เซย์จิ"
        },
        {
            "question": "ไม่มีใครรู้ว่าเขาคือใคร แต่ตัวตนสีดำเมี่ยมนี้ ดันมีชื่อเรียกทางการด้วย",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "ฮันซาวะ"
        },
        {
            "question": "นี่คือภาพจากคดีที่มีชื่อว่าอะไร",
            "image": "public/img/21.png",
            "audio": null,
            "video": null,
            "answer": "คดีฆาตกรรมบนรถไฟเหาะ"
        },
        {
            "question": "นี่คือภาพจากคดีที่มีชื่อว่าอะไร",
            "image": "public/img/22.png",
            "audio": null,
            "video": null,
            "answer": "คดีฆาตกรรมเปียโนโซนาต้า แสงจันทร์"
        },
        {
            "question": "นี่คือภาพจากคดีที่มีชื่อว่าอะไร",
            "image": "public/img/23.png",
            "audio": null,
            "video": null,
            "answer": "กรมตำรวจสั่นคลอน ตัวประกัน 12 ล้านคน"
        },
        {
            "question": "นี่คือภาพจากคดีที่มีชื่อว่าอะไร",
            "image": "public/img/24.png",
            "audio": null,
            "video": null,
            "answer": "การกลับมาของสีแดงเข้ม"
        },
        {
            "question": "นี่คือภาพจากคดีที่มีชื่อว่าอะไร",
            "image": "public/img/25.png",
            "audio": null,
            "video": null,
            "answer": "คดีฆาตกรรมในห้องสมุด"
        }
    ],
    "qa": {
        "question": "\"Karasuma Renya\" มีการพูดถึงครั้งแรกในมังงะเล่มที่เท่าไหร่, File ที่เท่าไหร่ และในฉบับอนิเมะ มีการพูดถึงครั้งแรกในตอนที่มีชื่อว่าอะไร",
        "answer": "เล่มที่ 30 / File 300 / รวมพลยอดนักสืบ! คุโด้ ชินอิจิ ปะทะ จอมโจรคิด",
        "choices": [
            "เล่มที่ 10 / File 100 / รวมพลยอดนักสืบ! คุโด้ ชินอิจิ ปะทะ จอมโจรคิด",
            "เล่มที่ 20 / File 200 / รวมพลยอดนักสืบ! คุโด้ ชินอิจิ ปะทะ จอมโจรคิด",
            "เล่มที่ 30 / File 300 / รวมพลยอดนักสืบ! คุโด้ ชินอิจิ ปะทะ จอมโจรคิด",
            "เล่มที่ 40 / File 400 / รวมพลยอดนักสืบ! คุโด้ ชินอิจิ ปะทะ จอมโจรคิด",
            "เล่มที่ 50 / File 500 / รวมพลยอดนักสืบ! คุโด้ ชินอิจิ ปะทะ จอมโจรคิด"
        ],
        "eliminateMode": "order",
        "eliminateOrder": [
            1,
            2,
            4
        ]
    },
    "jigsaw": {
        "mode": "square",
        "image": "public/img/jigsaw.png",
        "answer": "มัตสึดะ จิมเปย์",
        "question": "หลังจิ๊กซอว์นี้ นี่คือตัวละครในยอดนักสืบจิ๋วโคนันที่มีชื่อว่าอะไร"
    },
    "attribute": {
        "question": "นี่คือคุณสมบัติของตัวละครที่มีชื่อว่าอะไร",
        "clues": [
            "1 ในสมาชิกองค์กรชุดดำ",
            "ยังมีชีวิตอยู่",
            "เป็นนักวิทยาศาสตร์",
            "เพศหญิง",
            "1 ในผู้ถูกกินยาพิษ APTX4869"
        ],
        "answer": "Sherry"
    },
    "battle": {
        "player1": {
            "threeSecMode": "5sets",
            "threeSecondsHeaders": [
                "เลขสายรถเมล์ต่อไปนี้มีต้นทาง-ปลายทางคือที่ใด?",
                "ต้นทาง-ปลายทางต่อไปนี้คือรถเมล์สายใด?",
                "นี่คือเลขสายปฏิรูปคือของรถเมล์สายใด?",
                "สายต่อไปนี้ ปัจจุบันใช้รถเมล์ยี่ห้ออะไรบ้าง? (ตอบให้ครบ)",
                "นี่คือภาพรถเมล์สายใด? (ภาพทั้งคัน ลบเลขสายออก)"
            ],
            "threeSeconds": [
                {
                    "question": "เลขสายรถเมล์ต่อไปนี้มีต้นทาง-ปลายทางคือที่ใด?",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "text": "59",
                    "answer": "รังสิต - สนามหลวง"
                },
                {
                    "question": "เลขสายรถเมล์ต่อไปนี้มีต้นทาง-ปลายทางคือที่ใด?",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "text": "137",
                    "answer": "(วงกลม) รัชดาภิเษก - รามคำแหง"
                },
                {
                    "question": "เลขสายรถเมล์ต่อไปนี้มีต้นทาง-ปลายทางคือที่ใด?",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "text": "1-80E",
                    "answer": "สวนสยาม - MRT สนามไชย (ทางด่วน)"
                },
                {
                    "question": "เลขสายรถเมล์ต่อไปนี้มีต้นทาง-ปลายทางคือที่ใด?",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "text": "3-55",
                    "answer": "ท่าเรือคลองเตย - สะพานพระราม 7"
                },
                {
                    "question": "เลขสายรถเมล์ต่อไปนี้มีต้นทาง-ปลายทางคือที่ใด?",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "text": "67",
                    "answer": "วัดเสมียนนารี - Central พระราม 3"
                },
                {
                    "question": "ม.ธรรมศาสตร์ รังสิต - อนุสาวรีย์ชัยสมรภูมิ",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "510"
                },
                {
                    "question": "The Mall ท่าพระ - คลองเตย",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "195 / 205 (เดิม)"
                },
                {
                    "question": "(วงกลม) อู่กัลปพฤกษ์ - พระราม 2",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "750 / 209"
                },
                {
                    "question": "เคหะธนบุรี - หมู่บ้านนักกีฬาแหลมทอง",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "171"
                },
                {
                    "question": "ปากเกร็ด - วงเวียนใหญ่ (ทางด่วน)",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "505"
                },
                {
                    "question": "1-11",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "95ก"
                },
                {
                    "question": "2-41",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "36ก"
                },
                {
                    "question": "1-77",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "26A"
                },
                {
                    "question": "4-44",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "80A"
                },
                {
                    "question": "3-21",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "207"
                },
                {
                    "question": "47",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "HINO"
                },
                {
                    "question": "137",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "MITSUBISHI / DAEWOO"
                },
                {
                    "question": "113",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "NEX-Minebus"
                },
                {
                    "question": "26",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "MITSUBISHI / HINO / BONLUCK"
                },
                {
                    "question": "141",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "BONLUCK"
                },
                {
                    "question": "นี่คือภาพรถเมล์สายใด? (ภาพทั้งคัน ลบเลขสายออก)",
                    "image": "public/img/P1/21.png",
                    "audio": null,
                    "video": null,
                    "answer": "180"
                },
                {
                    "question": "นี่คือภาพรถเมล์สายใด? (ภาพทั้งคัน ลบเลขสายออก)",
                    "image": "public/img/P1/22.png",
                    "audio": null,
                    "video": null,
                    "answer": "13"
                },
                {
                    "question": "นี่คือภาพรถเมล์สายใด? (ภาพทั้งคัน ลบเลขสายออก)",
                    "image": "public/img/P1/23.png",
                    "audio": null,
                    "video": null,
                    "answer": "4-70E"
                },
                {
                    "question": "นี่คือภาพรถเมล์สายใด? (ภาพทั้งคัน ลบเลขสายออก)",
                    "image": "public/img/P1/24.png",
                    "audio": null,
                    "video": null,
                    "answer": "3-31"
                },
                {
                    "question": "นี่คือภาพรถเมล์สายใด? (ภาพทั้งคัน ลบเลขสายออก)",
                    "image": "public/img/P1/25.png",
                    "audio": null,
                    "video": null,
                    "answer": "96 (1-42)"
                }
            ],
            "qa": {
                "question": "การปรับการนับวันบัตรโดยสารล่วงหน้าอิเล็กทรอนิกส์จากที่เริ่มนับวันที่ 1 เป็นเริ่มนับจากวันที่ใช้งานจริง เริ่มใช้ครั้งแรกใน วัน/เดือน/ปี ใด",
                "answer": "8 มีนาคม พ.ศ. 2568",
                "choices": [
                    "1 ตุลาคม พ.ศ. 2562",
                    "5 ธันวาคม พ.ศ. 2565",
                    "1 มกราคม พ.ศ. 2568",
                    "8 มีนาคม พ.ศ. 2568",
                    "ไม่เคยปรับ"
                ],
                "eliminateMode": "random",
                "eliminateOrder": [
                    1,
                    2,
                    3,
                    5
                ]
            },
            "jigsaw": {
                "mode": "square",
                "image": "public/img/P1/jigsaw.png",
                "answer": "สาย 511",
                "question": "หลังจิ๊กซอว์นี้คือรถเมล์สายใด?"
            },
            "attribute": {
                "question": "นี่คือคุณสมบัติของรถเมล์สายใด",
                "clues": [
                    "เลขสายเดิมมี 2 หลัก เลขสายปฏิรูปขึ้นต้นด้วยเลข 1",
                    "อยู่ในเขตการเดินรถที่ 2",
                    "เส้นทางวิ่งจอดสามย่านมิตรทาวน์",
                    "เส้นทางวิ่งผ่านสถานีรถไฟฟ้าสายสีเหลือง",
                    "เส้นทางวิ่งไม่ผ่านอนุสาวรีย์ชัยสมรภูมิ"
                ],
                "answer": "สาย 93"
            }
        },
        "player2": {
            "threeSecMode": "2sets",
            "threeSecondsHeaders": [
                "นี่คือตัวละครที่มีชื่อว่าอะไร",
                "ตัวละครที่กำลังจะได้ยินต่อไปนี้ ปรากฎตัวครั้งแรกใน Spider-Man ภาคใด"
            ],
            "threeSeconds": [
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/01.png",
                    "audio": null,
                    "video": null,
                    "answer": "Peter Parker"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/02.png",
                    "audio": null,
                    "video": null,
                    "answer": "Miles Morales"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/03.png",
                    "audio": null,
                    "video": null,
                    "answer": "Green Goblin (Norman Osborn)"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/04.png",
                    "audio": null,
                    "video": null,
                    "answer": "Doctor Octopus (Otto Octavius)"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/05.png",
                    "audio": null,
                    "video": null,
                    "answer": "Gwen Stacy (Spider-Gwen / Ghost-Spider)"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/06.png",
                    "audio": null,
                    "video": null,
                    "answer": "Venom (Eddie Brock)"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/07.png",
                    "audio": null,
                    "video": null,
                    "answer": "Miguel O'Hara (Spiderman 2099)"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/08.png",
                    "audio": null,
                    "video": null,
                    "answer": "Kingpin (Wilson Fisk)"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/09.png",
                    "audio": null,
                    "video": null,
                    "answer": "Black Cat (Felicia Hardy)"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/10.png",
                    "audio": null,
                    "video": null,
                    "answer": "Ben Reilly (Scarlet Spider)"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/11.png",
                    "audio": null,
                    "video": null,
                    "answer": "Kraven the Hunter (Sergei Kravinoff)"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/12.png",
                    "audio": null,
                    "video": null,
                    "answer": "Ezekiel Sims"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/13.png",
                    "audio": null,
                    "video": null,
                    "answer": "Mary Jane Watson"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/14.png",
                    "audio": null,
                    "video": null,
                    "answer": "Spider-Ham (Peter Porker)"
                },
                {
                    "question": "นี่คือตัวละครที่มีชื่อว่าอะไร",
                    "image": "public/img/P2/15.png",
                    "audio": null,
                    "video": null,
                    "answer": "Michelle Jones-Watson"
                },
                {
                    "question": "Harry Osborn (New Goblin)",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "Spider-Man"
                },
                {
                    "question": "Dr. Curt Connors (The Lizard)",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "Spider-Man 2"
                },
                {
                    "question": "Elizabeth \"Liz\" Allan",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "Spider-Man: Homecoming"
                },
                {
                    "question": "Bonesaw McGraw",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "Spider-Man"
                },
                {
                    "question": "Mr. Ditkovich",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "Spider-Man 2"
                },
                {
                    "question": "Flash Thompson",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "Spider-Man: Homecoming"
                },
                {
                    "question": "Phineas Mason (The Tinkerer)",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "Spider-Man: Homecoming"
                },
                {
                    "question": "Spider-Man Noir",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "Spider-Man: Into the Spider-Verse"
                },
                {
                    "question": "Captain George Stacy",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "Spider-Man 3"
                },
                {
                    "question": "Ned Leeds",
                    "image": null,
                    "audio": null,
                    "video": null,
                    "answer": "Spider-Man: Homecoming"
                }
            ],
            "qa": {
                "question": "Spider-Man ฉบับทีวีซีรีส์ญี่ปุ่น ออกฉายครั้งแรกในปี ค.ศ. ใด / ผลิตโดยบริษัทอะไร / ร่างคนของ Spider-Man ฉบับทีวีซีรีส์ญี่ปุ่นมีชื่อว่าอะไร / นำแสดงโดยใคร?",
                "answer": "1978 / Toei / Yamashiro Takuya / Todou Shinji",
                "choices": [
                    "1975 / Toho / Mamiya Juuzou / Nakaya Noboru",
                    "1976 / Toho / Yamashiro Takuya / Todou Shinji",
                    "1977 / Toei / Yamashiro Takuya / Todou Shinji",
                    "1978 / Toei / Yamashiro Takuya / Todou Shinji",
                    "1979 / Toei / Mamiya Juuzou / Nakaya Noboru"
                ],
                "eliminateMode": "random",
                "eliminateOrder": [
                    1,
                    2,
                    3,
                    5
                ]
            },
            "jigsaw": {
                "mode": "square",
                "image": "public/img/P2/jigsaw.png",
                "answer": "Spider-Man: No Way Home",
                "question": "หลังจิ๊กซอว์นี้ นี่คือภาพจากภาพยนตร์หรือแอนิเมชั่น Spider-Man ภาคใด"
            },
            "attribute": {
                "question": "นี่คือคุณสมบัติของตัวละครจักรวาล Spider-Man ที่มีชื่อว่าอะไร?",
                "clues": [
                    "ร่างมนุษย์ปกติมีผมสีดำ",
                    "แปลงร่างไม่ได้",
                    "ไม่ได้มาจาก Earth-616",
                    "เพศหญิง แต่ไม่ใช่ตัวร้าย",
                    "1 ในสมาชิกไอ้แมงมุมใน Spider-Man: Into the Spider-Verse"
                ],
                "answer": "Peni Parker"
            }
        }
    }
};

export default GAME_CONFIG;