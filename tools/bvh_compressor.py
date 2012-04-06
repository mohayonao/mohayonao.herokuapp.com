#!/usr/bin/env python
# -*- coding: utf-8 -*-

import re
import os
import sys


compress_size = 4

def compressor(filepath):
    print "compress_size:", compress_size
    fout = open(filepath[:-4] + ".min.bvh", "w")
    inMotion, count, numFrames, outFrames = False, 0, 0, 0
    for l in open(filepath, "r"):
        matches = re.match("^Frames:\s*(\d+)$", l)
        if matches:
            numFrames = int(matches.group(1)) / compress_size
            fout.write("Frames: %d\n" % numFrames)
            continue
        matches = re.match("^Frame Time:\s*([.0-9]+)$", l)
        if matches:
            n = float(matches.group(1)) * compress_size
            fout.write("Frame Time: %f\n" % n)
            inMotion = True
            continue
        if inMotion:
            if count % compress_size == 0:
                fout.write(l)
                outFrames += 1
                if numFrames == outFrames: break
            count += 1
        else: fout.write(l)
    

def main(args):
    global compress_size
    for x in args:
        if x.isdigit():
            compress_size = int(x)
        elif x.endswith(".bvh") and os.path.exists(x):
            compressor(x)


if __name__ == "__main__":
    main(sys.argv[1:])
