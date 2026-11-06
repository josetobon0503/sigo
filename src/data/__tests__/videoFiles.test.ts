import {
  TEST_CLIP,
  ffmpegArgs,
  parseClipName,
  readyClips,
  renderVideosModule,
} from '../videoFiles';

const ids = new Set(['sit-to-stand', 'glute-bridge']);

describe('parseClipName', () => {
  it('reads the exercise and the chapter from the file name', () => {
    expect(parseClipName('sit-to-stand__como.mov', ids)).toEqual({
      ok: true,
      id: 'sit-to-stand',
      chapter: 'howTo',
      output: 'sit-to-stand__como.mp4',
    });
    expect(parseClipName('glute-bridge__NO.MP4', ids)).toMatchObject({
      ok: true,
      chapter: 'mistakes',
      output: 'glute-bridge__no.mp4',
    });
  });

  it('rejects other names and unknown ids', () => {
    for (const name of [
      'sit-to-stand.mov',
      'sit-to-stand__si.mov',
      'sit-to-stand__como.avi',
      TEST_CLIP,
    ]) {
      expect(parseClipName(name, ids)).toEqual({ ok: false, reason: 'name' });
    }
    expect(parseClipName('sentadilla__como.mov', ids)).toEqual({ ok: false, reason: 'unknownId' });
  });
});

describe('ffmpegArgs', () => {
  it('makes a 720p, 30 fps, silent H.264 MP4 at CRF 28 that starts fast', () => {
    const args = ffmpegArgs('in.mov', 'out.mp4').join(' ');
    expect(args).toContain('-i in.mov');
    expect(args).toContain('scale=-2:720,fps=30');
    expect(args).toContain('-c:v libx264');
    expect(args).toContain('-crf 28');
    expect(args).toContain('-an');
    expect(args).toContain('-movflags +faststart');
    expect(args.endsWith('out.mp4')).toBe(true);
  });
});

describe('readyClips and the videos module', () => {
  it('only counts our own compressed names, never the test clip', () => {
    const ready = readyClips(
      ['sit-to-stand__como.mp4', 'sit-to-stand__no.mov', TEST_CLIP, '.gitkeep', 'nope__no.mp4'],
      ids,
    );
    expect([...ready]).toEqual([['sit-to-stand', new Set(['howTo'])]]);
  });

  it('writes one literal require per clip', () => {
    const ready = readyClips(['glute-bridge__no.mp4', 'glute-bridge__como.mp4'], ids);
    expect(renderVideosModule(ready)).toContain(
      "'glute-bridge': { howTo: require('../../assets/videos/glute-bridge__como.mp4'), mistakes: require('../../assets/videos/glute-bridge__no.mp4') },",
    );
    expect(renderVideosModule(new Map())).toContain('> = {};');
  });
});
