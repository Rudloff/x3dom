/*
 * X3DOM JavaScript Library
 * http://x3dom.org
 *
 * (C)2009 Fraunhofer Insitute for Computer
 *         Graphics Reseach, Darmstadt
 * Dual licensed under the MIT and GPL.
 *
 * Based on code originally provided by
 * Philip Taylor: http://philip.html5.org
 */

/* ### X3DGeometryNode ### */
x3dom.registerNodeType(
    "X3DGeometryNode",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DNode,
        function (ctx) {
            x3dom.nodeTypes.X3DGeometryNode.superClass.call(this, ctx);

            this.addField_SFBool(ctx, 'solid', true);
            this.addField_SFBool(ctx, 'ccw', true);

            this._mesh = new x3dom.Mesh(this);
            this._pickable = true;
        },
        {
            getVolume: function(min, max, invalidate) {
                this._mesh.getBBox(min, max, invalidate);
                return true;
            },

            getCenter: function() {
                return this._mesh.getCenter();
            },

            doIntersect: function(line) {
                if (this._pickable) {
                    return this._mesh.doIntersect(line);
                }
                else {
                    return false;
                }
            },

            getColorTexture: function() {
                return null;
            },

            getColorTextureURL: function() {
                return null;
            }
        }
    )
);

/* ### Mesh ### */
x3dom.registerNodeType(
    "Mesh",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.Mesh.superClass.call(this, ctx);

            this.addField_SFString(ctx, 'primType', "triangle");
            this.addField_MFInt32(ctx, 'index', []);

            this.addField_MFNode('vertexAttributes', x3dom.nodeTypes.X3DVertexAttributeNode);
        },
        {
            nodeChanged: function()
            {
                var time0 = new Date().getTime();

                var i, n = this._cf.vertexAttributes.nodes.length;

                for (i=0; i<n; i++)
                {
                    var name = this._cf.vertexAttributes.nodes[i]._vf.name;

                    switch (name.toLowerCase())
                    {
                        case "position":
                            this._mesh._positions[0] = this._cf.vertexAttributes.nodes[i]._vf.value.toGL();
                            break;
                        case "normal":
                            this._mesh._normals[0] = this._cf.vertexAttributes.nodes[i]._vf.value.toGL();
                            break;
                        case "texcoord":
                            this._mesh._texCoords[0] = this._cf.vertexAttributes.nodes[i]._vf.value.toGL();
                            break;
                        case "color":
                            this._mesh._colors[0] = this._cf.vertexAttributes.nodes[i]._vf.value.toGL();
                            break;
                        default:
                            this._mesh._dynamicFields[name] = {};
                            this._mesh._dynamicFields[name].numComponents =
                                       this._cf.vertexAttributes.nodes[i]._vf.numComponents;
                            this._mesh._dynamicFields[name].value =
                                       this._cf.vertexAttributes.nodes[i]._vf.value.toGL();
                        break;
                    }
                }

                this._mesh._indices[0] = this._vf.index.toGL();
                this._mesh._invalidate = true;
                this._mesh._numFaces = this._mesh._indices[0].length / 3;
                this._mesh._numCoords = this._mesh._positions[0].length / 3;

                var time1 = new Date().getTime() - time0;
                x3dom.debug.logWarning("Mesh load time: " + time1 + " ms");
            }
        }
    )
);

/* ### BinaryGeometry ### */
x3dom.registerNodeType(
    "BinaryGeometry",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.BinaryGeometry.superClass.call(this, ctx);

            this.addField_SFInt32(ctx, 'vertexCount', 0);
            this.addField_SFString(ctx, 'primType', "TRIANGLES");
            this.addField_SFString(ctx, 'index', "");       // Uint16
            this.addField_SFString(ctx, 'coord', "");    // Float32
            this.addField_SFString(ctx, 'normal', "");
            this.addField_SFString(ctx, 'texcoord', "");
            this.addField_SFString(ctx, 'color', "");
        },
        {
            nodeChanged: function()
            {
                // TODO
            }
        }
    )
);

/* ### PointSet ### */
x3dom.registerNodeType(
    "PointSet",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.PointSet.superClass.call(this, ctx);

            this.addField_SFNode('coord', x3dom.nodeTypes.Coordinate);
            this.addField_SFNode('color', x3dom.nodeTypes.X3DColorNode);

            this._pickable = false;
        },
        {
            nodeChanged: function()
            {
                var time0 = new Date().getTime();

                var coordNode = this._cf.coord.node;
                x3dom.debug.assert(coordNode);
                var positions = coordNode._vf.point;

                var numColComponents = 3;
                var colorNode = this._cf.color.node;
                var colors = new x3dom.fields.MFColor();
                if (colorNode) {
                    colors = colorNode._vf.color;
                    x3dom.debug.assert(positions.length == colors.length);

                    if (x3dom.isa(colorNode, x3dom.nodeTypes.ColorRGBA)) {
                        numColComponents = 4;
                    }
                }
                else {
                    for (var i=0, n=positions.length; i<n; i++) {
                        colors.push(1.0);
                    }
                }

                this._mesh._numColComponents = numColComponents;
                this._mesh._indices[0] = [];
                this._mesh._positions[0] = positions.toGL();
                this._mesh._colors[0] = colors.toGL();
                this._mesh._normals[0] = [];
                this._mesh._texCoords[0] = [];
                this._mesh._lit = false;
                this._mesh._invalidate = true;
                this._mesh._numCoords = this._mesh._positions[0].length / 3;

                var time1 = new Date().getTime() - time0;
                //x3dom.debug.logInfo("Mesh load time: " + time1 + " ms");
            },

            fieldChanged: function(fieldName)
            {
                var pnts;
                var i, n;

                if (fieldName == "coord")   // same as in IFS
                {
                    pnts = this._cf.coord.node._vf.point;
                    n = pnts.length;

                    this._mesh._positions[0] = [];

                    // TODO; optimize (is there a memcopy?)
                    for (i=0; i<n; i++)
                    {
                        this._mesh._positions[0].push(pnts[i].x);
                        this._mesh._positions[0].push(pnts[i].y);
                        this._mesh._positions[0].push(pnts[i].z);
                    }

                    this._mesh._invalidate = true;

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.positions = true;
                    });
                }
                else if (fieldName == "color")
                {
                    pnts = this._cf.color.node._vf.color;
                    n = pnts.length;

                    this._mesh._colors[0] = [];

                    for (i=0; i<n; i++)
                    {
                        this._mesh._colors[0].push(pnts[i].r);
                        this._mesh._colors[0].push(pnts[i].g);
                        this._mesh._colors[0].push(pnts[i].b);
                    }

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.colors = true;
                    });
                }
            }
        }
    )
);

/* ### X3DComposedGeometryNode ### */
x3dom.registerNodeType(
    "X3DComposedGeometryNode",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.X3DComposedGeometryNode.superClass.call(this, ctx);

            this.addField_SFBool(ctx, 'colorPerVertex', true);
            this.addField_SFBool(ctx, 'normalPerVertex', true);

            this.addField_MFNode('attrib', x3dom.nodeTypes.X3DVertexAttributeNode);

            this.addField_SFNode('coord', x3dom.nodeTypes.X3DCoordinateNode);
            this.addField_SFNode('normal', x3dom.nodeTypes.Normal);
            this.addField_SFNode('color', x3dom.nodeTypes.X3DColorNode);
            this.addField_SFNode('texCoord', x3dom.nodeTypes.X3DTextureCoordinateNode);
        },
        {
            handleAttribs: function()
            {
                //var time0 = new Date().getTime();

                var i, n = this._cf.attrib.nodes.length;

                for (i=0; i<n; i++)
                {
                    var name = this._cf.attrib.nodes[i]._vf.name;

                    switch (name.toLowerCase())
                    {
                        case "position":
                            this._mesh._positions[0] = this._cf.attrib.nodes[i]._vf.value.toGL();
                            break;
                        case "normal":
                            this._mesh._normals[0] = this._cf.attrib.nodes[i]._vf.value.toGL();
                            break;
                        case "texcoord":
                            this._mesh._texCoords[0] = this._cf.attrib.nodes[i]._vf.value.toGL();
                            break;
                        case "color":
                            this._mesh._colors[0] = this._cf.attrib.nodes[i]._vf.value.toGL();
                            break;
                        default:
                            this._mesh._dynamicFields[name] = {};
                            this._mesh._dynamicFields[name].numComponents =
                                       this._cf.attrib.nodes[i]._vf.numComponents;
                            this._mesh._dynamicFields[name].value =
                                       this._cf.attrib.nodes[i]._vf.value.toGL();
                        break;
                    }
                }

                //var time1 = new Date().getTime() - time0;
                //x3dom.debug.logInfo("Mesh load time: " + time1 + " ms");
            }
        }
    )
);

/* ### IndexedLineSet ### */
x3dom.registerNodeType(
    "IndexedLineSet",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.IndexedLineSet.superClass.call(this, ctx);

            this.addField_SFBool(ctx, 'colorPerVertex', true);  // TODO

            this.addField_MFNode('attrib', x3dom.nodeTypes.X3DVertexAttributeNode);
            this.addField_SFNode('coord', x3dom.nodeTypes.X3DCoordinateNode);
            this.addField_SFNode('color', x3dom.nodeTypes.X3DColorNode);

            this.addField_MFInt32(ctx, 'coordIndex', []);
            this.addField_MFInt32(ctx, 'colorIndex', []);

            this._pickable = false;
        },
        {
            nodeChanged: function()
            {
                var time0 = new Date().getTime();

                // this.handleAttribs();

                var indexes = this._vf.coordIndex;
                var colorInd = this._vf.colorIndex;

                var hasColor = false, hasColorInd = false;

                // TODO; implement colorPerVertex also for single index
                var colPerVert = this._vf.colorPerVertex;

                if (colorInd.length > 0)
                {
                    hasColorInd = true;
                }

                var positions, colors;

                var coordNode = this._cf.coord.node;
                x3dom.debug.assert(coordNode);
                
                positions = coordNode.getPoints();

                var numColComponents = 3;
                var colorNode = this._cf.color.node;
                if (colorNode)
                {
                    hasColor = true;
                    colors = colorNode._vf.color;

                    if (x3dom.isa(colorNode, x3dom.nodeTypes.ColorRGBA)) {
                        numColComponents = 4;
                    }
                }
                else {
                    hasColor = false;
                }

                this._mesh._indices[0] = [];
                this._mesh._positions[0] = [];
                this._mesh._colors[0] = [];

                var i, t, cnt, lineCnt;
                var p0, p1, c0, c1;

                if ( (hasColor && hasColorInd) )
                {
                    // Found MultiIndex Mesh
                    t = 0;
                    cnt = 0;
                    lineCnt = 0;

                    for (i=0; i < indexes.length; ++i)
                    {
                        if (indexes[i] === -1) {
                            t = 0;
                            continue;
                        }

                        if (hasColorInd) {
                            x3dom.debug.assert(colorInd[i] != -1);
                        }

                        switch (t)
                        {
                            case 0:
                                p0 = +indexes[i];
                                if (hasColorInd && colPerVert) { c0 = +colorInd[i]; }
                                else { c0 = p0; }
                                t = 1;
                            break;
                            case 1:
                                p1 = +indexes[i];
                                if (hasColorInd && colPerVert) { c1 = +colorInd[i]; }
                                else if (hasColorInd && !colPerVert) { c1 = +colorInd[lineCnt]; }
                                else { c1 = p1; }

                                this._mesh._indices[0].push(cnt++, cnt++);

                                this._mesh._positions[0].push(positions[p0].x);
                                this._mesh._positions[0].push(positions[p0].y);
                                this._mesh._positions[0].push(positions[p0].z);
                                this._mesh._positions[0].push(positions[p1].x);
                                this._mesh._positions[0].push(positions[p1].y);
                                this._mesh._positions[0].push(positions[p1].z);

                                if (hasColor) {
                                    if (!colPerVert) {
                                        c0 = c1;
                                    }
                                    this._mesh._colors[0].push(colors[c0].r);
                                    this._mesh._colors[0].push(colors[c0].g);
                                    this._mesh._colors[0].push(colors[c0].b);
                                    this._mesh._colors[0].push(colors[c1].r);
                                    this._mesh._colors[0].push(colors[c1].g);
                                    this._mesh._colors[0].push(colors[c1].b);
                                }

                                t = 2;
                                lineCnt++;
                            break;
                            case 3:
                                p0 = p1;
                                c0 = c1;
                                p1 = +indexes[i];
                                if (hasColorInd && colPerVert) { c1 = +colorInd[i]; }
                                else if (hasColorInd && !colPerVert) { c1 = +colorInd[lineCnt]; }
                                else { c1 = p1; }

                                this._mesh._indices[0].push(cnt++, cnt++);

                                this._mesh._positions[0].push(positions[p0].x);
                                this._mesh._positions[0].push(positions[p0].y);
                                this._mesh._positions[0].push(positions[p0].z);
                                this._mesh._positions[0].push(positions[p1].x);
                                this._mesh._positions[0].push(positions[p1].y);
                                this._mesh._positions[0].push(positions[p1].z);

                                if (hasColor) {
                                    if (!colPerVert) {
                                        c0 = c1;
                                    }
                                    this._mesh._colors[0].push(colors[c0].r);
                                    this._mesh._colors[0].push(colors[c0].g);
                                    this._mesh._colors[0].push(colors[c0].b);
                                    this._mesh._colors[0].push(colors[c1].r);
                                    this._mesh._colors[0].push(colors[c1].g);
                                    this._mesh._colors[0].push(colors[c1].b);
                                }

                                lineCnt++;
                            break;
                            default:
                        }
                    }
                } // if isMulti
                else
                {
                    t = 0;

                    for (i=0; i < indexes.length; ++i)
                    {
                        if (indexes[i] === -1) {
                            t = 0;
                            continue;
                        }

                        switch (t) {
                        case 0: p0 = +indexes[i]; t = 1; break;
                        case 1: p1 = +indexes[i]; t = 2; this._mesh._indices[0].push(p0, p1); break;
                        case 2: p0 = p1; p1 = +indexes[i]; this._mesh._indices[0].push(p0, p1); break;
                        }
                    }

                    this._mesh._positions[0] = positions.toGL();

                    if (hasColor) {
                        this._mesh._colors[0] = colors.toGL();
                        this._mesh._numColComponents = numColComponents;
                    }
                }

                this._mesh._invalidate = true;
                this._mesh._numCoords = this._mesh._positions[0].length / 3;

                var time1 = new Date().getTime() - time0;
                //x3dom.debug.logInfo("Mesh load time: " + time1 + " ms");
            },

            fieldChanged: function(fieldName)
            {
                var pnts;
                var i, n;

                if (fieldName == "coord")
                {
                    // TODO; multi-index with different this._mesh._indices
                    pnts = this._cf.coord.node._vf.point;
                    n = pnts.length;

                    this._mesh._positions[0] = [];

                    for (i=0; i<n; i++)
                    {
                        this._mesh._positions[0].push(pnts[i].x);
                        this._mesh._positions[0].push(pnts[i].y);
                        this._mesh._positions[0].push(pnts[i].z);
                    }

                    this._mesh._invalidate = true;

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.positions = true;
                    });
                }
                else if (fieldName == "color")
                {
                    pnts = this._cf.color.node._vf.color;
                    n = pnts.length;

                    this._mesh._colors[0] = [];

                    for (i=0; i<n; i++)
                    {
                        this._mesh._colors[0].push(pnts[i].r);
                        this._mesh._colors[0].push(pnts[i].g);
                        this._mesh._colors[0].push(pnts[i].b);
                    }

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.colors = true;
                    });
                }
            }
        }
    )
);


/* ### IndexedTriangleSet ### */
x3dom.registerNodeType(
    "IndexedTriangleSet",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DComposedGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.IndexedTriangleSet.superClass.call(this, ctx);

            this.addField_MFInt32(ctx, 'index', []);
        },
        {
            nodeChanged: function()
            {
                var time0 = new Date().getTime();

                this.handleAttribs();

                // TODO; implement normalPerVertex
                var normPerVert = this._vf.normalPerVertex;

                var indexes = this._vf.index;

                var hasNormal = false, hasTexCoord = false, hasColor = false;
                var positions, normals, texCoords, colors;

                var coordNode = this._cf.coord.node;
                x3dom.debug.assert(coordNode);
                positions = coordNode._vf.point;

                var normalNode = this._cf.normal.node;
                if (normalNode) {
                    hasNormal = true;
                    normals = normalNode._vf.vector;
                }
                else {
                    hasNormal = false;
                }

                var texMode = "", numTexComponents = 2;
                var texCoordNode = this._cf.texCoord.node;
                if (texCoordNode) {
                    if (texCoordNode._vf.point) {
                        hasTexCoord = true;
                        texCoords = texCoordNode._vf.point;

                        if (x3dom.isa(texCoordNode, x3dom.nodeTypes.TextureCoordinate3D)) {
                            numTexComponents = 3;
                        }
                    }
                    else if (texCoordNode._vf.mode) {
                        texMode = texCoordNode._vf.mode;
                    }
                }
                else {
                    hasTexCoord = false;
                }

                var numColComponents = 3;
                var colorNode = this._cf.color.node;
                if (colorNode) {
                    hasColor = true;
                    colors = colorNode._vf.color;

                    if (x3dom.isa(colorNode, x3dom.nodeTypes.ColorRGBA)) {
                        numColComponents = 4;
                    }
                }
                else {
                    hasColor = false;
                }

                this._mesh._indices[0] = [];
                this._mesh._positions[0] = [];
                this._mesh._normals[0] = [];
                this._mesh._texCoords[0] = [];
                this._mesh._colors[0] = [];

                var i, t, cnt, faceCnt, posMax;
                var p0, p1, p2, n0, n1, n2, t0, t1, t2, c0, c1, c2;

                while ( positions.length % 3 > 0) {
                    positions.push(positions.length-1);
                }
                posMax = positions.length;

                if ( (positions.length > 65535) )
                {
                    t = 0;
                    cnt = 0;
                    faceCnt = 0;
                    this._mesh._multiIndIndices = [];
                    this._mesh._posSize = positions.length;

                    for (i=0; i < indexes.length; ++i)
                    {
                        // Convert non-triangular polygons to a triangle fan
                        // (TODO: this assumes polygons are convex)

//                        if ((i > 0) && !(i % 3)) {
                        if ((i > 0) && (i % 3 === 0 )) {
                            t = 0;
                            faceCnt++;
                        }

                        //TODO: OPTIMIZE but think about cache coherence regarding arrays!!!
                        switch (t)
                        {
                            case 0:
                                p0 = +indexes[i];
                                n0 = p0;
                                t0 = p0;
                                c0 = p0;
                                t = 1;
                            break;
                            case 1:
                                p1 = +indexes[i];
                                n1 = p1;
                                t1 = p1;
                                c1 = p1;
                                t = 2;
                            break;
                            case 2:
                                p2 = +indexes[i];
                                n2 = p2;
                                t2 = p2;
                                c2 = p2;
                                t = 3;

                                this._mesh._indices[0].push(cnt++, cnt++, cnt++);

                                this._mesh._positions[0].push(positions[p0].x);
                                this._mesh._positions[0].push(positions[p0].y);
                                this._mesh._positions[0].push(positions[p0].z);
                                this._mesh._positions[0].push(positions[p1].x);
                                this._mesh._positions[0].push(positions[p1].y);
                                this._mesh._positions[0].push(positions[p1].z);
                                this._mesh._positions[0].push(positions[p2].x);
                                this._mesh._positions[0].push(positions[p2].y);
                                this._mesh._positions[0].push(positions[p2].z);

                                if (hasNormal) {
                                    this._mesh._normals[0].push(normals[n0].x);
                                    this._mesh._normals[0].push(normals[n0].y);
                                    this._mesh._normals[0].push(normals[n0].z);
                                    this._mesh._normals[0].push(normals[n1].x);
                                    this._mesh._normals[0].push(normals[n1].y);
                                    this._mesh._normals[0].push(normals[n1].z);
                                    this._mesh._normals[0].push(normals[n2].x);
                                    this._mesh._normals[0].push(normals[n2].y);
                                    this._mesh._normals[0].push(normals[n2].z);
                                }
                                else {
                                    this._mesh._multiIndIndices.push(p0, p1, p2);
                                    //this._mesh._multiIndIndices.push(cnt-3, cnt-2, cnt-1);
                                }

                                if (hasColor) {
                                    this._mesh._colors[0].push(colors[c0].r);
                                    this._mesh._colors[0].push(colors[c0].g);
                                    this._mesh._colors[0].push(colors[c0].b);
                                    if (numColComponents === 4) {
                                        this._mesh._colors[0].push(colors[c0].a);
                                    }
                                    this._mesh._colors[0].push(colors[c1].r);
                                    this._mesh._colors[0].push(colors[c1].g);
                                    this._mesh._colors[0].push(colors[c1].b);
                                    if (numColComponents === 4) {
                                        this._mesh._colors[0].push(colors[c1].a);
                                    }
                                    this._mesh._colors[0].push(colors[c2].r);
                                    this._mesh._colors[0].push(colors[c2].g);
                                    this._mesh._colors[0].push(colors[c2].b);
                                    if (numColComponents === 4) {
                                        this._mesh._colors[0].push(colors[c2].a);
                                    }
                                }

                                if (hasTexCoord) {
                                    this._mesh._texCoords[0].push(texCoords[t0].x);
                                    this._mesh._texCoords[0].push(texCoords[t0].y);
                                    if (numTexComponents === 3) {
                                        this._mesh._texCoords[0].push(texCoords[t0].z);
                                    }
                                    this._mesh._texCoords[0].push(texCoords[t1].x);
                                    this._mesh._texCoords[0].push(texCoords[t1].y);
                                    if (numTexComponents === 3) {
                                        this._mesh._texCoords[0].push(texCoords[t1].z);
                                    }
                                    this._mesh._texCoords[0].push(texCoords[t2].x);
                                    this._mesh._texCoords[0].push(texCoords[t2].y);
                                    if (numTexComponents === 3) {
                                        this._mesh._texCoords[0].push(texCoords[t2].z);
                                    }
                                }

                                //faceCnt++;
                            break;
                            default:
                        }
                    }

                    if (!hasNormal) {
                        this._mesh.calcNormals(Math.PI);
                    }
                    if (!hasTexCoord) {
                        this._mesh.calcTexCoords(texMode);
                    }

                    this._mesh.splitMesh();

                    //x3dom.debug.logInfo(this._mesh._indices.length);
                } // if isMulti
                else
                {
                    this._mesh._indices[0] = indexes.toGL();
                    this._mesh._positions[0] = positions.toGL();

                    if (hasNormal) {
                        this._mesh._normals[0] = normals.toGL();
                    }
                    else {
                        this._mesh.calcNormals(Math.PI);
                    }
                    if (hasTexCoord) {
                        this._mesh._texCoords[0] = texCoords.toGL();
                        this._mesh._numTexComponents = numTexComponents;
                    }
                    else {
                        this._mesh.calcTexCoords(texMode);
                    }
                    if (hasColor) {
                        this._mesh._colors[0] = colors.toGL();
                        this._mesh._numColComponents = numColComponents;
                    }
                }

                this._mesh._invalidate = true;
                this._mesh._numFaces = 0;
                this._mesh._numCoords = 0;
                for (i=0; i<this._mesh._indices.length; i++) {
                    this._mesh._numFaces += this._mesh._indices[i].length / 3;
                    this._mesh._numCoords += this._mesh._positions[i].length / 3;
                }

                var time1 = new Date().getTime() - time0;
                //x3dom.debug.logInfo("Mesh load time: " + time1 + " ms");
            },

            fieldChanged: function(fieldName)
            {
                var pnts;
                var i, n;

                if (fieldName == "coord")
                {
                    // TODO; multi-index with different this._mesh._indices
                    pnts = this._cf.coord.node._vf.point;
                    n = pnts.length;

                    this._mesh._positions[0] = [];

                    // TODO; optimize (is there a memcopy?)
                    for (i=0; i<n; i++)
                    {
                        this._mesh._positions[0].push(pnts[i].x);
                        this._mesh._positions[0].push(pnts[i].y);
                        this._mesh._positions[0].push(pnts[i].z);
                    }

                    this._mesh._invalidate = true;

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.positions = true;
                    });
                }
                else if (fieldName == "color")
                {
                    pnts = this._cf.color.node._vf.color;
                    n = pnts.length;

                    this._mesh._colors[0] = [];

                    for (i=0; i<n; i++)
                    {
                        this._mesh._colors[0].push(pnts[i].r);
                        this._mesh._colors[0].push(pnts[i].g);
                        this._mesh._colors[0].push(pnts[i].b);
                    }

                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.colors = true;
                    });
                }
            }
        }
    )
);


/* ### IndexedTriangleStripSet ### */
x3dom.registerNodeType(
    "IndexedTriangleStripSet",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DComposedGeometryNode,
        function (ctx) {
            x3dom.nodeTypes.IndexedTriangleStripSet.superClass.call(this, ctx);
			
            this.addField_MFInt32(ctx, 'index', []);
        },
        {
            nodeChanged: function() {
				
                var time0 = new Date().getTime();

                this.handleAttribs();
	
                var hasNormal = false, hasTexCoord = false, hasColor = false;

                var colPerVert = this._vf.colorPerVertex;
                var normPerVert = this._vf.normalPerVertex;

                var indexes = this._vf.index;
				var positions, normals, texCoords, colors;

                var coordNode = this._cf.coord.node;
                x3dom.debug.assert(coordNode);
                positions = coordNode._vf.point;

                var normalNode = this._cf.normal.node;
                if (normalNode) {
                    hasNormal = true;
                    normals = normalNode._vf.vector;
                }
                else {
                    hasNormal = false;
                }

                var texMode = "", numTexComponents = 2;
                var texCoordNode = this._cf.texCoord.node;
                if (texCoordNode) {
                    if (texCoordNode._vf.point) {
                        hasTexCoord = true;
                        texCoords = texCoordNode._vf.point;

                        if (x3dom.isa(texCoordNode, x3dom.nodeTypes.TextureCoordinate3D)) {
                            numTexComponents = 3;
                        }
                    }
                    else if (texCoordNode._vf.mode) {
                        texMode = texCoordNode._vf.mode;
                    }
                }
                else {
                    hasTexCoord = false;
                }
				this._mesh._numTexComponents = numTexComponents;

                var numColComponents = 3;
                var colorNode = this._cf.color.node;
                if (colorNode) {
                    hasColor = true;
                    colors = colorNode._vf.color;

                    if (x3dom.isa(colorNode, x3dom.nodeTypes.ColorRGBA)) {
                        numColComponents = 4;
                    }
                }
                else {
                    hasColor = false;
                }
				this._mesh._numColComponents = numColComponents;
				
                this._mesh._indices[0] = [];
                this._mesh._positions[0] = [];
                this._mesh._normals[0] = [];
                this._mesh._texCoords[0] = [];
                this._mesh._colors[0] = [];
				
				var faceCnt = 0, cnt = 0;
				var p1, p2 , p3, n1, n2, n3, t1, t2, t3, c1, c2, c3;
				
				
				/*if(hasNormal && hasTexCoord) {
					
					this._mesh._primType = 'TRIANGLE_STRIP';
					
					for (i=0; i < indexes.length; ++i)
					{
						if (indexes[i] == -1) {
							faceCnt++;
							continue;
						}
						
						p1 = indexes[i];
						
						if (normPerVert) { 
							n1 = p1;
						} else if (!normPerVert) {
							n1 = faceCnt;
						}
						if (colPerVert) {
							c1 = p1;
						} else if (!colPerVert) { 
							c1 = faceCnt;
						}
						
						this._mesh._indices[0].push(i)	;
						this._mesh._positions[0].push(positions[p1].x);
						this._mesh._positions[0].push(positions[p1].y);
						this._mesh._positions[0].push(positions[p1].z);
						
						
						this._mesh._normals[0].push(normals[n1].x);
						this._mesh._normals[0].push(normals[n1].y);
						this._mesh._normals[0].push(normals[n1].z);
						
						if (hasColor) {
							this._mesh._colors[0].push(colors[c1].r);
							this._mesh._colors[0].push(colors[c1].g);
							this._mesh._colors[0].push(colors[c1].b);
							if (numColComponents === 4) {
								this._mesh._colors[0].push(colors[c1].a);
							}    
						}
						
						
						this._mesh._texCoords[0].push(texCoords[p1].x);
						this._mesh._texCoords[0].push(texCoords[p1].y);
						if (numTexComponents === 3) {
							this._mesh._texCoords[0].push(texCoords[p1].z);
						}
					}
					this._mesh.splitMesh();
				} else */if ( (positions.length > 65535) || hasNormal  || hasTexCoord || hasColor) {
					for (i=1; i < indexes.length-2; ++i)
					{
						if (indexes[i+1] == -1) {
							i = i+2;
							faceCnt++;
							continue;
						}
						
						p1 = indexes[i];
						p2 = indexes[i-1];
						p3 = indexes[i+1];
						
						if (normPerVert) { 
							n1 = p1;
							n2 = p2;
							n3 = p3;
						} else if (!normPerVert) {
							n1 = n2 = n3 = faceCnt;
						}
						 
						t1 = p1;
						t2 = p2;
						t3 = p3;

						if (colPerVert) {
							c1 = p1;
							c2 = p2;
							c3 = p3;
						} else if (!colPerVert) { 
							c1 = c2 = c3 = faceCnt;
						}
	
						this._mesh._indices[0].push(cnt++, cnt++, cnt++);				
						
						this._mesh._positions[0].push(positions[p1].x);
						this._mesh._positions[0].push(positions[p1].y);
						this._mesh._positions[0].push(positions[p1].z);
						this._mesh._positions[0].push(positions[p2].x);
						this._mesh._positions[0].push(positions[p2].y);
						this._mesh._positions[0].push(positions[p2].z);
						this._mesh._positions[0].push(positions[p3].x);
						this._mesh._positions[0].push(positions[p3].y);
						this._mesh._positions[0].push(positions[p3].z);
					   
						if (hasNormal) {
							this._mesh._normals[0].push(normals[n1].x);
							this._mesh._normals[0].push(normals[n1].y);
							this._mesh._normals[0].push(normals[n1].z);
							this._mesh._normals[0].push(normals[n2].x);
							this._mesh._normals[0].push(normals[n2].y);
							this._mesh._normals[0].push(normals[n2].z);
							this._mesh._normals[0].push(normals[n3].x);
							this._mesh._normals[0].push(normals[n3].y);
							this._mesh._normals[0].push(normals[n3].z);
									   
						}
	
						if (hasColor) {
							this._mesh._colors[0].push(colors[c1].r);
							this._mesh._colors[0].push(colors[c1].g);
							this._mesh._colors[0].push(colors[c1].b);
							if (numColComponents === 4) {
								this._mesh._colors[0].push(colors[c1].a);
							}    
							this._mesh._colors[0].push(colors[c2].r);
							this._mesh._colors[0].push(colors[c2].g);
							this._mesh._colors[0].push(colors[c2].b);
							if (numColComponents === 4) {
								this._mesh._colors[0].push(colors[c2].a);
							}    
							this._mesh._colors[0].push(colors[c3].r);
							this._mesh._colors[0].push(colors[c3].g);
							this._mesh._colors[0].push(colors[c3].b);
							if (numColComponents === 4) {
								this._mesh._colors[0].push(colors[c3].a);
							}    
						}
	
						if (hasTexCoord) {
							this._mesh._texCoords[0].push(texCoords[t1].x);
							this._mesh._texCoords[0].push(texCoords[t1].y);
							if (numTexComponents === 3) {
								this._mesh._texCoords[0].push(texCoords[t1].z);
							}
							this._mesh._texCoords[0].push(texCoords[t2].x);
							this._mesh._texCoords[0].push(texCoords[t2].y);
							if (numTexComponents === 3) {
								this._mesh._texCoords[0].push(texCoords[t2].z);
							}
							this._mesh._texCoords[0].push(texCoords[t3].x);
							this._mesh._texCoords[0].push(texCoords[t3].y);
							if (numTexComponents === 3) {
								this._mesh._texCoords[0].push(texCoords[t3].z);
							}
						}						
					}
					
					if (!hasNormal) {
						this._mesh.calcNormals(Math.PI);
					}
					
					if (!hasTexCoord) {
					  this._mesh.calcTexCoords(texMode);
					}
			
					this._mesh.splitMesh();
	
				} else {	
					for (i = 1; i < indexes.length; ++i)
					{
						if (indexes[i+1] == -1) {
							i = i+2;
							continue;
						}
						this._mesh._indices[0].push(indexes[i])	
						this._mesh._indices[0].push(indexes[i-1])	
						this._mesh._indices[0].push(indexes[i+1])	
					}
					
					this._mesh._positions[0] = positions.toGL();
	
                    if (hasNormal) {
                        this._mesh._normals[0] = normals.toGL();
                    }
                    else {
                        this._mesh.calcNormals(Math.PI);
                    }
                    if (hasTexCoord) {
                        this._mesh._texCoords[0] = texCoords.toGL();
                        this._mesh._numTexComponents = numTexComponents;
                    }
                    else {
                        this._mesh.calcTexCoords(texMode);
                    }
                    if (hasColor) {
                        this._mesh._colors[0] = colors.toGL();
                        this._mesh._numColComponents = numColComponents;
                    }
					
				}
				
				this._mesh._invalidate = true;
                this._mesh._numFaces = 0;
                this._mesh._numCoords = 0;
                for (i=0; i<this._mesh._indices.length; i++) {
                    this._mesh._numFaces += this._mesh._indices[i].length / 3;
                    this._mesh._numCoords += this._mesh._positions[i].length / 3;
                }
				
				 var time1 = new Date().getTime() - time0;
           },
		   fieldChanged: function (fieldName) {

                if (fieldName == "coord") {
					this._mesh._positions[0] = [];
					this._mesh._indices[0] =[];
					this._mesh._normals[0] = [];
					this._mesh._texCoords[0] =[];
		
					var hasNormal = false, hasTexCoord = false, hasColor = false;

					var colPerVert = this._vf.colorPerVertex;
					var normPerVert = this._vf.normalPerVertex;
	
					var indexes = this._vf.index;
					var positions, normals, texCoords, colors;
	
					var coordNode = this._cf.coord.node;
					x3dom.debug.assert(coordNode);
					positions = coordNode._vf.point;
	
					var normalNode = this._cf.normal.node;
					if (normalNode) {
						hasNormal = true;
						normals = normalNode._vf.vector;
					}
					else {
						hasNormal = false;
					}
	
					var texMode = "", numTexComponents = 2;
					var texCoordNode = this._cf.texCoord.node;
					if (texCoordNode) {
						if (texCoordNode._vf.point) {
							hasTexCoord = true;
							texCoords = texCoordNode._vf.point;
	
							if (x3dom.isa(texCoordNode, x3dom.nodeTypes.TextureCoordinate3D)) {
								numTexComponents = 3;
							}
						}
						else if (texCoordNode._vf.mode) {
							texMode = texCoordNode._vf.mode;
						}
					}
					else {
						hasTexCoord = false;
					}
					this._mesh._numTexComponents = numTexComponents;
	
					var numColComponents = 3;
					var colorNode = this._cf.color.node;
					if (colorNode) {
						hasColor = true;
						colors = colorNode._vf.color;
	
						if (x3dom.isa(colorNode, x3dom.nodeTypes.ColorRGBA)) {
							numColComponents = 4;
						}
					}
					else {
						hasColor = false;
					}
					this._mesh._numColComponents = numColComponents;
					
					this._mesh._indices[0] = [];
					this._mesh._positions[0] = [];
					this._mesh._normals[0] = [];
					this._mesh._texCoords[0] = [];
					this._mesh._colors[0] = [];
					
					var faceCnt = 0, cnt = 0;
					var p1, p2 , p3, n1, n2, n3, t1, t2, t3, c1, c2, c3;
					 
					/*if(hasNormal && hasTexCoord) {
					
						this._mesh._primType = 'TRIANGLE_STRIP';
						
						for (i=0; i < indexes.length; ++i)
						{
							if (indexes[i] == -1) {
								faceCnt++;
								continue;
							}
							
							p1 = indexes[i];
							
							if (normPerVert) { 
								n1 = p1;
							} else if (!normPerVert) {
								n1 = faceCnt;
							}
							if (colPerVert) {
								c1 = p1;
							} else if (!colPerVert) { 
								c1 = faceCnt;
							}
							
							this._mesh._indices[0].push(i)	;
							this._mesh._positions[0].push(positions[p1].x);
							this._mesh._positions[0].push(positions[p1].y);
							this._mesh._positions[0].push(positions[p1].z);
							
							
							this._mesh._normals[0].push(normals[n1].x);
							this._mesh._normals[0].push(normals[n1].y);
							this._mesh._normals[0].push(normals[n1].z);
							
							if (hasColor) {
								this._mesh._colors[0].push(colors[c1].r);
								this._mesh._colors[0].push(colors[c1].g);
								this._mesh._colors[0].push(colors[c1].b);
								if (numColComponents === 4) {
									this._mesh._colors[0].push(colors[c1].a);
								}    
							}
							
							
							this._mesh._texCoords[0].push(texCoords[p1].x);
							this._mesh._texCoords[0].push(texCoords[p1].y);
							if (numTexComponents === 3) {
								this._mesh._texCoords[0].push(texCoords[p1].z);
							}
						}
						this._mesh.splitMesh();
					} else */if ( (positions.length > 65535) || hasNormal  || hasTexCoord || hasColor) {
						
						for (i=1; i < indexes.length-2; ++i)
						{
							if (indexes[i+1] == -1) {
								i = i+2;
								faceCnt++;
								continue;
							}
							
							p1 = indexes[i];
							p2 = indexes[i-1];
							p3 = indexes[i+1];
							
							if (normPerVert) { 
								n1 = p1;
								n2 = p2;
								n3 = p3;
							} else if (!normPerVert) {
								n1 = n2 = n3 = faceCnt;
							}
							 
							t1 = p1;
							t2 = p2;
							t3 = p3;
	
							if (colPerVert) {
								c1 = p1;
								c2 = p2;
								c3 = p3;
							} else if (!colPerVert) { 
								c1 = c2 = c3 = faceCnt;
							}
		
							this._mesh._indices[0].push(cnt++, cnt++, cnt++);				
							
							this._mesh._positions[0].push(positions[p1].x);
							this._mesh._positions[0].push(positions[p1].y);
							this._mesh._positions[0].push(positions[p1].z);
							this._mesh._positions[0].push(positions[p2].x);
							this._mesh._positions[0].push(positions[p2].y);
							this._mesh._positions[0].push(positions[p2].z);
							this._mesh._positions[0].push(positions[p3].x);
							this._mesh._positions[0].push(positions[p3].y);
							this._mesh._positions[0].push(positions[p3].z);
						   
							if (hasNormal) {
								this._mesh._normals[0].push(normals[n1].x);
								this._mesh._normals[0].push(normals[n1].y);
								this._mesh._normals[0].push(normals[n1].z);
								this._mesh._normals[0].push(normals[n2].x);
								this._mesh._normals[0].push(normals[n2].y);
								this._mesh._normals[0].push(normals[n2].z);
								this._mesh._normals[0].push(normals[n3].x);
								this._mesh._normals[0].push(normals[n3].y);
								this._mesh._normals[0].push(normals[n3].z);
										   
							}
		
							if (hasColor) {
								this._mesh._colors[0].push(colors[c1].r);
								this._mesh._colors[0].push(colors[c1].g);
								this._mesh._colors[0].push(colors[c1].b);
								if (numColComponents === 4) {
									this._mesh._colors[0].push(colors[c1].a);
								}    
								this._mesh._colors[0].push(colors[c2].r);
								this._mesh._colors[0].push(colors[c2].g);
								this._mesh._colors[0].push(colors[c2].b);
								if (numColComponents === 4) {
									this._mesh._colors[0].push(colors[c2].a);
								}    
								this._mesh._colors[0].push(colors[c3].r);
								this._mesh._colors[0].push(colors[c3].g);
								this._mesh._colors[0].push(colors[c3].b);
								if (numColComponents === 4) {
									this._mesh._colors[0].push(colors[c3].a);
								}    
							}
		
							if (hasTexCoord) {
								this._mesh._texCoords[0].push(texCoords[t1].x);
								this._mesh._texCoords[0].push(texCoords[t1].y);
								if (numTexComponents === 3) {
									this._mesh._texCoords[0].push(texCoords[t1].z);
								}
								this._mesh._texCoords[0].push(texCoords[t2].x);
								this._mesh._texCoords[0].push(texCoords[t2].y);
								if (numTexComponents === 3) {
									this._mesh._texCoords[0].push(texCoords[t2].z);
								}
								this._mesh._texCoords[0].push(texCoords[t3].x);
								this._mesh._texCoords[0].push(texCoords[t3].y);
								if (numTexComponents === 3) {
									this._mesh._texCoords[0].push(texCoords[t3].z);
								}
							}						
						}
						
						if (!hasNormal) {
							this._mesh.calcNormals(Math.PI);
						}
						
						if (!hasTexCoord) {
						  this._mesh.calcTexCoords(texMode);
						}
				
						this._mesh.splitMesh();
		
					} else {
						
						for (i = 1; i < indexes.length; ++i)
						{
							if (indexes[i+1] == -1) {
								i = i+2;
								continue;
							}
							this._mesh._indices[0].push(indexes[i])	
							this._mesh._indices[0].push(indexes[i-1])	
							this._mesh._indices[0].push(indexes[i+1])	
						}
						
						this._mesh._positions[0] = positions.toGL();
		
						if (hasNormal) {
							this._mesh._normals[0] = normals.toGL();
						}
						else {
							this._mesh.calcNormals(Math.PI);
						}
						if (hasTexCoord) {
							this._mesh._texCoords[0] = texCoords.toGL();
							this._mesh._numTexComponents = numTexComponents;
						}
						else {
							this._mesh.calcTexCoords(texMode);
						}
						if (hasColor) {
							this._mesh._colors[0] = colors.toGL();
							this._mesh._numColComponents = numColComponents;
						}
						
					}
					
					this._mesh._invalidate = true;
					this._mesh._numFaces = 0;
					this._mesh._numCoords = 0;
					for (i=0; i<this._mesh._indices.length; i++) {
						this._mesh._numFaces += this._mesh._indices[i].length / 3;
						this._mesh._numCoords += this._mesh._positions[i].length / 3;
					}
	
					Array.forEach(this._parentNodes, function (node) {
						node.setAllDirty();
					});
					
                }
				else if (fieldName == "color") {
					var col = this._cf.color.node._vf.color;
 					var faceCnt = 0;
					var c1 = c2 = c3 = 0;
					
					var numColComponents = 3;	
                   
					if (x3dom.isa(this._cf.color.node, x3dom.nodeTypes.ColorRGBA)) {
						numColComponents = 4;
					}
					
					this._mesh._colors[0] = [];
					
					var indexes = this._vf.index;
					
					if(this._mesh._primType == 'TRIANGLE_STRIP') {
						
						for (i=0; i < indexes.length; ++i)
						{
							if (indexes[i] == -1) {	
								faceCnt++;
								continue;
							}
							
							if (this._vf.colorPerVertex) { 
								c1 = indexes[i];								
							} else if (!this._vf.colorPerVertex) {
								c1 = faceCnt;
							}
							this._mesh._colors[0].push(col[c1].r);
							this._mesh._colors[0].push(col[c1].g);
							this._mesh._colors[0].push(col[c1].b);
							if (numColComponents === 4) {
								this._mesh._colors[0].push(col[c1].a);
							}  
						}
						
					} else {	
						for (i=1; i < indexes.length-2; ++i)
						{
							if (indexes[i+1] == -1) {
								i = i+2;
								faceCnt++;
								continue;
							}
							
							if (this._vf.colorPerVertex) { 
								c1 = indexes[i];
								c2 = indexes[i-1];
								c3 = indexes[i+1];
							} else if (!this._vf.colorPerVertex) {
								c1 = c2 = c3 = faceCnt;
							}
							this._mesh._colors[0].push(col[c1].r);
							this._mesh._colors[0].push(col[c1].g);
							this._mesh._colors[0].push(col[c1].b);
							if (numColComponents === 4) {
								this._mesh._colors[0].push(col[c1].a);
							}  
							this._mesh._colors[0].push(col[c2].r);
							this._mesh._colors[0].push(col[c2].g);
							this._mesh._colors[0].push(col[c2].b);
							if (numColComponents === 4) {
								this._mesh._colors[0].push(col[c2].a);
							}  
							this._mesh._colors[0].push(col[c3].r);
							this._mesh._colors[0].push(col[c3].g);
							this._mesh._colors[0].push(col[c3].b);
							if (numColComponents === 4) {
								this._mesh._colors[0].push(col[c3].a);
							}  
						}
					}
					 
                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.colors = true;
                    }); 
                }  
				else if (fieldName == "normal") {
                   var nor = this._cf.normal.node._vf.vector;
				   var faceCnt = 0;
					var n1 = n2 = n3 = 0;
					
					this._mesh._normals[0] = [];
					
					var indexes = this._vf.index;
					
					if(this._mesh._primType == 'TRIANGLE_STRIP') {
						
						for (i=0; i < indexes.length; ++i)
						{
							if (indexes[i] == -1) {					
								faceCnt++;
								continue;
							}
							
							if (this._vf.normalPerVertex) { 
								n1 = indexes[i];					
							} else if (!this._vf.normalPerVertex) {
								n1 = faceCnt;
							}
							this._mesh._normals[0].push(nor[n1].x);
							this._mesh._normals[0].push(nor[n1].y);
							this._mesh._normals[0].push(nor[n1].z);	
						}
						
					} else {					
						for (i=1; i < indexes.length-2; ++i)
						{
							if (indexes[i+1] == -1) {
								i = i+2;
								faceCnt++;
								continue;
							}
							
							if (this._vf.normalPerVertex) { 
								n1 = indexes[i];
								n2 = indexes[i-1];
								n3 = indexes[i+1];
							} else if (!this._vf.normalPerVertex) {
								n1 = n2 = n3 = faceCnt;
							}
							this._mesh._normals[0].push(nor[n1].x);
							this._mesh._normals[0].push(nor[n1].y);
							this._mesh._normals[0].push(nor[n1].z);
							this._mesh._normals[0].push(nor[n2].x);
							this._mesh._normals[0].push(nor[n2].y);
							this._mesh._normals[0].push(nor[n2].z);
							this._mesh._normals[0].push(nor[n3].x);
							this._mesh._normals[0].push(nor[n3].y);
							this._mesh._normals[0].push(nor[n3].z);
						}
					}
					
                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.normals = true;
                    }); 
                }
				else if (fieldName == "texCoord") {
                    var tex = this._cf.texCoord.node._vf.point;
					var t1 = t2 = t3 = 0;
					
					var numTexComponents = 2;	
                   
					if (x3dom.isa(this._cf.texCoord.node, x3dom.nodeTypes.TextureCoordinate3D)) {
                    	numTexComponents = 3;
                    }
					
					this._mesh._texCoords[0] = [];
					var indexes = this._vf.index;
					
					if(this._mesh._primType == 'TRIANGLE_STRIP') {
						
						for (i=0; i < indexes.length; ++i)
						{
							if (indexes[i] == -1) {
								continue;
							}
							
							t1 = indexes[i];

							this._mesh._texCoords[0].push(tex[t1].x);
							this._mesh._texCoords[0].push(tex[t1].y);
							if (numTexComponents === 3) {
								this._mesh._texCoords[0].push(tex[t1].z);
							}  	
						}
						
					} else {
						
						for (i=1; i < indexes.length-2; ++i)
						{
							if (indexes[i+1] == -1) {
								i = i+2;
								continue;
							}
							
							t1 = indexes[i];
							t2 = indexes[i-1];
							t3 = indexes[i+1];
							
							this._mesh._texCoords[0].push(tex[t1].x);
							this._mesh._texCoords[0].push(tex[t1].y);
							if (numTexComponents === 3) {
								this._mesh._texCoords[0].push(tex[t1].z);
							}  
							this._mesh._texCoords[0].push(tex[t2].x);
							this._mesh._texCoords[0].push(tex[t2].y);                       
							if (numTexComponents === 3) {
								this._mesh._texCoords[0].tex(col[t2].z);
							}  
							this._mesh._texCoords[0].push(tex[t3].x);
							this._mesh._texCoords[0].push(tex[t3].y);               
							if (numTexComponents === 3) {
								this._mesh._texCoords[0].push(tex[t3].z);
							}  
							
						}
					}
					
                    Array.forEach(this._parentNodes, function (node) {
                        node._dirty.texCoords = true;
                    }); 
                }
           }
        }
    )
);


/* ### X3DGeometricPropertyNode ### */
x3dom.registerNodeType(
    "X3DGeometricPropertyNode",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DNode,
        function (ctx) {
            x3dom.nodeTypes.X3DGeometricPropertyNode.superClass.call(this, ctx);
        }
    )
);

/* ### X3DCoordinateNode ### */
x3dom.registerNodeType(
    "X3DCoordinateNode",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometricPropertyNode,
        function (ctx) {
            x3dom.nodeTypes.X3DCoordinateNode.superClass.call(this, ctx);
        },
        {
            fieldChanged: function (fieldName) {
                if (fieldName === "coord") {
                    Array.forEach(this._parentNodes, function (node) {
                        node.fieldChanged("coord");
                    });
                }
            },

            parentAdded: function (parent) {
                if (parent._mesh && parent._cf.coord.node !== this) {
                    parent.fieldChanged("coord");
                }
            }
        }
      )
);


/* ### Coordinate ### */
x3dom.registerNodeType(
    "Coordinate",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DCoordinateNode,
        function (ctx) {
            x3dom.nodeTypes.Coordinate.superClass.call(this, ctx);

            this.addField_MFVec3f(ctx, 'point', []);
        },
        {
            getPoints: function() {
                return this._vf.point;
            }
        }
    )
);


/* ### Normal ### */
x3dom.registerNodeType(
    "Normal",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometricPropertyNode,
        function (ctx) {
            x3dom.nodeTypes.Normal.superClass.call(this, ctx);

            this.addField_MFVec3f(ctx, 'vector', []);
        },
        {
            fieldChanged: function (fieldName) {
                if (fieldName === "normal") {
                    Array.forEach(this._parentNodes, function (node) {
                        node.fieldChanged("normal");
                    });
                }
            },

            parentAdded: function (parent) {
                if (parent._mesh && //parent._cf.coord.node &&
                    parent._cf.normal.node !== this) {
                    parent.fieldChanged("normal");
                }
            }
        }
    )
);

/* ### X3DColorNode ### */
x3dom.registerNodeType(
    "X3DColorNode",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DGeometricPropertyNode,
        function (ctx) {
            x3dom.nodeTypes.X3DColorNode.superClass.call(this, ctx);
        },
        {
            fieldChanged: function (fieldName) {
                if (fieldName === "color") {
                    Array.forEach(this._parentNodes, function (node) {
                        node.fieldChanged("color");
                    });
                }
            },

            parentAdded: function (parent) {
                if (parent._mesh && //parent._cf.coord.node &&
                    parent._cf.color.node !== this) {
                    parent.fieldChanged("color");
                }
            }
        }
    )
);

/* ### Color ### */
x3dom.registerNodeType(
    "Color",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DColorNode,
        function (ctx) {
            x3dom.nodeTypes.Color.superClass.call(this, ctx);

            this.addField_MFColor(ctx, 'color', []);
        }
    )
);

/* ### ColorRGBA ### */
x3dom.registerNodeType(
    "ColorRGBA",
    "Rendering",
    defineClass(x3dom.nodeTypes.X3DColorNode,
        function (ctx) {
            x3dom.nodeTypes.ColorRGBA.superClass.call(this, ctx);

            this.addField_MFColorRGBA(ctx, 'color', []);
        }
    )
);

