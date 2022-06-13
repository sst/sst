export default {
    "scalars": [
        1,
        3,
        6
    ],
    "types": {
        "Article": {
            "comments": [
                2
            ],
            "id": [
                1
            ],
            "title": [
                1
            ],
            "url": [
                1
            ],
            "__typename": [
                3
            ]
        },
        "ID": {},
        "Comment": {
            "id": [
                3
            ],
            "text": [
                3
            ],
            "__typename": [
                3
            ]
        },
        "String": {},
        "Mutation": {
            "addComment": [
                2,
                {
                    "articleID": [
                        3,
                        "String!"
                    ],
                    "text": [
                        3,
                        "String!"
                    ]
                }
            ],
            "createArticle": [
                0,
                {
                    "title": [
                        3,
                        "String!"
                    ],
                    "url": [
                        3,
                        "String!"
                    ]
                }
            ],
            "__typename": [
                3
            ]
        },
        "Query": {
            "articles": [
                0
            ],
            "__typename": [
                3
            ]
        },
        "Boolean": {}
    }
}