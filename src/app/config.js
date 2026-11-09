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
    "threeSecMode": "3sets",
    "threeSecondsHeaders": [
        "นี่คือเสียงจากเพลงที่มีชื่อว่าอะไร",
        "อัลบั้ม/ลำดับชุดต่อไปนี้มีชื่อว่าอะไร",
        "นี่คือคุณสมบัติของบุคคลที่เกี่ยวข้องกับจินตหรา พูนลาภ ที่มีชื่อว่าอะไร"
    ],
    "threeSeconds": [
        {
            "question": "นี่คือเสียงจากเพลงที่มีชื่อว่าอะไร",
            "image": null,
            "audio": "public/audio/01.mp3",
            "video": null,
            "answer": "เต่างอย"
        },
        {
            "question": "นี่คือเสียงจากเพลงที่มีชื่อว่าอะไร",
            "image": null,
            "audio": "public/audio/02.mp3",
            "video": null,
            "answer": "รักสลายดอกฝ้ายบาน"
        },
        {
            "question": "นี่คือเสียงจากเพลงที่มีชื่อว่าอะไร",
            "image": null,
            "audio": "public/audio/03.mp3",
            "video": null,
            "answer": "ฮักบ่าวอีสานใต้"
        },
        {
            "question": "นี่คือเสียงจากเพลงที่มีชื่อว่าอะไร",
            "image": null,
            "audio": "public/audio/04.mp3",
            "video": null,
            "answer": "น้ำตาสาววาริน"
        },
        {
            "question": "นี่คือเสียงจากเพลงที่มีชื่อว่าอะไร",
            "image": null,
            "audio": "public/audio/05.mp3",
            "video": null,
            "answer": "หมอลำแร็ปเปอร์"
        },
        {
            "question": "นี่คือเสียงจากเพลงที่มีชื่อว่าอะไร",
            "image": null,
            "audio": "public/audio/06.mp3",
            "video": null,
            "answer": "ผัวขับรถเมียบดแป้ง"
        },
        {
            "question": "นี่คือเสียงจากเพลงที่มีชื่อว่าอะไร",
            "image": null,
            "audio": "public/audio/07.mp3",
            "video": null,
            "answer": "คอยรักจากหนุ่มถลุงแร่"
        },
        {
            "question": "นี่คือเสียงจากเพลงที่มีชื่อว่าอะไร",
            "image": null,
            "audio": "public/audio/08.mp3",
            "video": null,
            "answer": "คอยรักจากเยอรมัน"
        },
        {
            "question": "นี่คือเสียงจากเพลงที่มีชื่อว่าอะไร",
            "image": null,
            "audio": "public/audio/09.mp3",
            "video": null,
            "answer": "อาลัยเวิลด์เทรด"
        },
        {
            "question": "นี่คือเสียงจากเพลงที่มีชื่อว่าอะไร",
            "image": null,
            "audio": "public/audio/10.mp3",
            "video": null,
            "answer": "แตงโมจินตหรา"
        },
        {
            "question": "หมอลำสะออน ชุดที่3",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "น้ำตาหล่นบนเถียงนา"
        },
        {
            "question": "จินตหราครบเครื่อง ชุดที่1",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "ธนาคารน้ำตา"
        },
        {
            "question": "ลูกทุ่งสะออน ชุดที่4",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "สาวน้ำพองสะอื้น"
        },
        {
            "question": "ชุดที่9",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "สาวอีสานพลัดถิ่น"
        },
        {
            "question": "จินตหราครบเครื่อง ชุดที่7",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "เคยรักกันบ้างไหม"
        },
        {
            "question": "หมอลำสะออน ชุดที่12",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "ฮัลโหลโทรผิด"
        },
        {
            "question": "ร็อคหมอลำสะออน ชุดที่10",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "พญานาคฝากรัก"
        },
        {
            "question": "ชุดที่22",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "รอพี่ที่ บ.ข.ส."
        },
        {
            "question": "จินมาแล้วจ้า ชุดที่1",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "ซังบ่าวเจ้าชู้"
        },
        {
            "question": "ชุดที่1",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "ถูกหลอกออกโรงเรียน"
        },
        {
            "question": "นักร้องระดับซุปเปอร์สตาร์ที่จินตหราเคยไปFeat.ในเพลง มาทำไม และ แฟนจ๋า",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "เบิร์ด ธงไชย แมคอินไตย์"
        },
        {
            "question": "นักแสดงชื่อดังที่เป็นผู้กำกับ MV และพระเอก MV เพลง เมียหลวงทวงสิทธิ์",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "ศรราม เทพพิทักษ์"
        },
        {
            "question": "ผู้กำกับภาพยนตร์เรื่องแรกและเรื่องเดียวของจินตหรา พูนลาภ",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "พชร์ อานนท์"
        },
        {
            "question": "ผู้ที่โดนแป้งร่วมกับจินตหราในระเบิดเถิดเทิงตอน วาระสุดท้าย",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "ยายชา เถิดเทิง"
        },
        {
            "question": "ศิลปินที่ร่วมFeat ในเพลง จินตหราแอ๊บแบ๊ว",
            "image": null,
            "audio": null,
            "video": null,
            "answer": "อี๊ด โปงลางสะออน"
        }
    ],
    "qa": {
        "question": "ในรายการ เลขมหาสมบัติ (เทปที่6) ที่จินตหรา พูนลาภ ได้ไปออกเมื่อปี 2546 คำตอบทั้ง3คำตอบในช่วง เลขลับดารา มีผลรวมกันทั้งหมดเท่าไหร่",
        "answer": "45",
        "choices": [
            "23",
            "34",
            "45",
            "56",
            "67"
        ],
        "eliminateMode": "order",
        "eliminateOrder": [
            4,
            1,
            2
        ]
    },
    "jigsaw": {
        "mode": "square",
        "image": "public/img/jigsaw.png",
        "answer": "สันติสุข พรหมศิริ",
        "question": "หลังจิ๊กซอว์นี้ จินตหรา พูนลาภ อยู่กับใคร"
    },
    "attribute": {
        "question": "นี่คือคุณสมบัติของเพลงที่มีชื่อว่าอะไร",
        "clues": [
            "ไม่ใช่เพลงลำดับแรกของอัลบั้ม",
            "คนแต่งทั้งคำร้องและทำนองเป็นศิลปินแห่งชาติ",
            "ไม่ใช่เพลงหมอลำ",
            "เคยถูกร้องในรายการชิงช้าสวรรค์",
            "ชื่อเพลงเป็นชื่ออัลบั้มที่ออกในยุค GMM Grammy ก่อนมาสเตอร์เทป"
        ],
        "answer": "แรงงานข้าวเหนียว"
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