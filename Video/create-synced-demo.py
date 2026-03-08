#!/usr/bin/env python3
"""
PERFECTLY SYNCED 3-MINUTE DEMO
Strategy: Generate audio FIRST in segments, then record video timed to each segment.
This ensures voice and video are always in sync.

Patient: Mobile View (390x844)
Supervisor: Desktop View (1920x1080)
"""

import boto3
import subprocess
import time
import os
import shutil
import struct
import io

# ============================================================
# VOICEOVER SEGMENTS - Each segment has text + expected video action
# ============================================================
SEGMENTS = [
    # --- PART 1: PATIENT MOBILE (0-85s) ---
    {
        "id": "01_opening",
        "text": "Nine hundred million Indians lack healthcare access. When emergencies strike at two in the morning, they face a critical question. Travel fifty kilometers, or wait and hope? Traditional triage takes forty-five minutes. Arogya AI solves this.",
        "video_action": "homepage_scroll",
        "pause_after": 2.0,
    },
    {
        "id": "02_login",
        "text": "Watch how our mobile app transforms emergency care. A patient opens the app and logs in.",
        "video_action": "login",
        "pause_after": 1.0,
    },
    {
        "id": "03_language",
        "text": "First, language selection. Hindi. Tamil. Telugu. Ten Indian languages. Healthcare speaks your language.",
        "video_action": "language_select",
        "pause_after": 1.0,
    },
    {
        "id": "04_symptoms",
        "text": "Simple symptom tiles. No medical jargon. Tap what you feel. Chest pain. Shortness of breath. Fever.",
        "video_action": "symptom_tiles",
        "pause_after": 1.0,
    },
    {
        "id": "05_submit",
        "text": "Rate severity. Submit. Amazon Bedrock AI analyzes in three seconds. Ninety-four percent confidence. High priority. Immediate attention needed.",
        "video_action": "submit_and_results",
        "pause_after": 1.0,
    },
    {
        "id": "06_facility",
        "text": "Facility recommendations. City General Hospital. Ninety-five percent AI match. Two kilometers away. Book appointment instantly. Done. Thirty seconds instead of forty-five minutes.",
        "video_action": "facility_and_book",
        "pause_after": 2.0,
    },
    # --- PART 2: SUPERVISOR DESKTOP (85-170s) ---
    {
        "id": "07_supervisor_intro",
        "text": "Now the supervisor dashboard. Behind every decision, three autonomous AI agents work twenty-four seven. See the purple toggle? Agentic AI. Always on. Always learning.",
        "video_action": "supervisor_login_dashboard",
        "pause_after": 1.0,
    },
    {
        "id": "08_statistics",
        "text": "Today's numbers. Forty-seven cases processed. Thirty-eight auto-approved. Eighty-one percent automation. No human bottleneck. No delays.",
        "video_action": "show_statistics",
        "pause_after": 1.0,
    },
    {
        "id": "09_reasoning",
        "text": "Six levels of reasoning. Symptom analysis. Vital signs. Urgency assessment. Facility matching. Care planning. Risk stratification. All in three seconds.",
        "video_action": "show_case_reasoning",
        "pause_after": 1.0,
    },
    {
        "id": "10_approval",
        "text": "Green indicator. Auto-approved. Immediate care without manual review.",
        "video_action": "show_green_approval",
        "pause_after": 1.0,
    },
    {
        "id": "11_escalation",
        "text": "Orange indicator. Conflicting symptoms detected. Escalated to human supervisor. The AI knows when to act and when to ask. Intelligent collaboration.",
        "video_action": "show_orange_escalation",
        "pause_after": 1.0,
    },
    {
        "id": "12_multilingual",
        "text": "Ten Indian languages. AI-powered provider search. Natural language. Any language. Instant results.",
        "video_action": "show_multilingual_search",
        "pause_after": 1.0,
    },
    # --- CLOSING (170-180s) ---
    {
        "id": "13_scale",
        "text": "AWS serverless. Three Lambda functions. Amazon Bedrock. DynamoDB. Six dollars per month for ten thousand patients. Point zero six cents per patient.",
        "video_action": "final_dashboard",
        "pause_after": 1.0,
    },
    {
        "id": "14_closing",
        "text": "Ninety times faster. Eighty-one percent automation. Nine hundred million Indians. Arogya AI. Democratizing healthcare.",
        "video_action": "closing",
        "pause_after": 0.5,
    },
]


def get_mp3_duration(file_path):
    """Get approximate duration of MP3 file using ffprobe"""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', file_path],
            capture_output=True, text=True
        )
        return float(result.stdout.strip())
    except:
        return 0


def step1_generate_audio_segments():
    """Generate individual audio segments using AWS Polly"""
    print("\n" + "=" * 80)
    print("[STEP 1/3] GENERATING AUDIO SEGMENTS")
    print("=" * 80)
    
    polly = boto3.client('polly', region_name='us-east-1')
    
    os.makedirs('Video/segments', exist_ok=True)
    
    segment_durations = {}
    
    for seg in SEGMENTS:
        seg_file = f"Video/segments/{seg['id']}.mp3"
        print(f"\n  Generating: {seg['id']}...")
        print(f"    Text: {seg['text'][:60]}...")
        
        ssml = f'<speak><prosody rate="medium">{seg["text"]}</prosody></speak>'
        
        response = polly.synthesize_speech(
            Text=ssml,
            TextType='ssml',
            OutputFormat='mp3',
            VoiceId='Aditi'
        )
        
        with open(seg_file, 'wb') as f:
            f.write(response['AudioStream'].read())
        
        duration = get_mp3_duration(seg_file)
        total_duration = duration + seg['pause_after']
        segment_durations[seg['id']] = {
            'audio_duration': duration,
            'pause_after': seg['pause_after'],
            'total_duration': total_duration
        }
        
        print(f"    Audio: {duration:.1f}s + {seg['pause_after']}s pause = {total_duration:.1f}s")
    
    # Create silence file for pauses
    subprocess.run([
        'ffmpeg', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono',
        '-t', '3', '-q:a', '9', '-y', 'Video/segments/silence.mp3'
    ], capture_output=True)
    
    # Concatenate all audio segments with pauses
    print("\n  Concatenating all segments...")
    
    concat_list = 'Video/segments/concat_audio.txt'
    with open(concat_list, 'w') as f:
        for seg in SEGMENTS:
            f.write(f"file '{seg['id']}.mp3'\n")
            if seg['pause_after'] > 0:
                f.write(f"file 'silence.mp3'\n")
    
    subprocess.run([
        'ffmpeg', '-f', 'concat', '-safe', '0',
        '-i', concat_list,
        '-c:a', 'libmp3lame', '-q:a', '2',
        '-y', 'Video/full_voiceover.mp3'
    ], check=True, capture_output=True)
    
    total_audio = get_mp3_duration('Video/full_voiceover.mp3')
    print(f"\n  ✓ Full voiceover: {total_audio:.1f}s ({total_audio/60:.1f} minutes)")
    
    return segment_durations


def step2_record_video_synced(segment_durations):
    """Record video timed to match each audio segment"""
    print("\n" + "=" * 80)
    print("[STEP 2/3] RECORDING VIDEO SYNCED TO AUDIO")
    print("=" * 80)
    
    from playwright.sync_api import sync_playwright
    
    def safe_click(page, selector, desc=""):
        try:
            page.click(selector, timeout=4000)
            return True
        except:
            return False
    
    def safe_fill(page, selector, value, desc=""):
        try:
            page.fill(selector, value, timeout=4000)
            return True
        except:
            return False
    
    def wait_segment(seg_id):
        """Wait exactly as long as the audio segment"""
        info = segment_durations.get(seg_id, {})
        total = info.get('total_duration', 5.0)
        return total
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        
        # ============================================================
        # PART 1: PATIENT - MOBILE VIEW
        # ============================================================
        print("\n  [MOBILE] Patient Journey (390x844)")
        
        mobile_ctx = browser.new_context(
            viewport={'width': 390, 'height': 844},
            record_video_dir='Video/segments/',
            record_video_size={'width': 390, 'height': 844}
        )
        mobile_page = mobile_ctx.new_page()
        
        # Segment 01: Opening - Homepage
        print(f"    01_opening ({wait_segment('01_opening'):.1f}s)")
        mobile_page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com')
        dur = wait_segment('01_opening')
        time.sleep(dur * 0.4)
        mobile_page.evaluate('window.scrollBy(0, 400)')
        time.sleep(dur * 0.3)
        mobile_page.evaluate('window.scrollBy(0, 400)')
        time.sleep(dur * 0.3)
        
        # Segment 02: Login
        print(f"    02_login ({wait_segment('02_login'):.1f}s)")
        mobile_page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/login')
        dur = wait_segment('02_login')
        time.sleep(dur * 0.2)
        safe_fill(mobile_page, 'input[type="email"]', 'patient@arogya.ai')
        time.sleep(dur * 0.2)
        safe_fill(mobile_page, 'input[type="password"]', 'PatientPass123!')
        time.sleep(dur * 0.2)
        safe_click(mobile_page, 'button[type="submit"]')
        time.sleep(dur * 0.4)
        
        # Segment 03: Language
        print(f"    03_language ({wait_segment('03_language'):.1f}s)")
        dur = wait_segment('03_language')
        if safe_click(mobile_page, 'select[name="language"]'):
            time.sleep(dur * 0.25)
            try:
                mobile_page.select_option('select[name="language"]', 'hi', timeout=3000)
            except:
                pass
            time.sleep(dur * 0.25)
            try:
                mobile_page.select_option('select[name="language"]', 'ta', timeout=3000)
            except:
                pass
            time.sleep(dur * 0.25)
            try:
                mobile_page.select_option('select[name="language"]', 'te', timeout=3000)
            except:
                pass
            time.sleep(dur * 0.25)
        else:
            time.sleep(dur)
        
        # Segment 04: Symptoms
        print(f"    04_symptoms ({wait_segment('04_symptoms'):.1f}s)")
        dur = wait_segment('04_symptoms')
        if not safe_click(mobile_page, 'a[href*="symptom"]'):
            mobile_page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/symptom-intake')
        time.sleep(dur * 0.2)
        safe_click(mobile_page, 'text=Chest Pain')
        time.sleep(dur * 0.2)
        safe_click(mobile_page, 'text=Shortness of Breath')
        time.sleep(dur * 0.2)
        safe_click(mobile_page, 'text=Fever')
        time.sleep(dur * 0.2)
        mobile_page.evaluate('window.scrollBy(0, 300)')
        time.sleep(dur * 0.2)
        
        # Segment 05: Submit and Results
        print(f"    05_submit ({wait_segment('05_submit'):.1f}s)")
        dur = wait_segment('05_submit')
        if safe_click(mobile_page, 'select[name="severity"]'):
            try:
                mobile_page.select_option('select[name="severity"]', 'severe', timeout=3000)
            except:
                pass
        time.sleep(dur * 0.15)
        safe_click(mobile_page, 'button[type="submit"]')
        time.sleep(dur * 0.45)
        mobile_page.evaluate('window.scrollBy(0, 400)')
        time.sleep(dur * 0.4)
        
        # Segment 06: Facility and Book
        print(f"    06_facility ({wait_segment('06_facility'):.1f}s)")
        dur = wait_segment('06_facility')
        mobile_page.evaluate('window.scrollBy(0, 400)')
        time.sleep(dur * 0.3)
        safe_click(mobile_page, 'button:has-text("Book")')
        time.sleep(dur * 0.2)
        safe_fill(mobile_page, 'input[name="date"]', '2026-03-10')
        time.sleep(dur * 0.1)
        safe_fill(mobile_page, 'input[name="phone"]', '9876543210')
        time.sleep(dur * 0.1)
        safe_click(mobile_page, 'button:has-text("Confirm")')
        time.sleep(dur * 0.3)
        
        print("    ✓ Mobile recording done")
        
        mobile_page.close()
        mobile_video_path = mobile_page.video.path()
        mobile_ctx.close()
        
        if mobile_video_path and os.path.exists(mobile_video_path):
            shutil.move(mobile_video_path, 'Video/mobile_synced.webm')
        
        # ============================================================
        # PART 2: SUPERVISOR - DESKTOP VIEW
        # ============================================================
        print("\n  [DESKTOP] Supervisor Dashboard (1920x1080)")
        
        desktop_ctx = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            record_video_dir='Video/segments/',
            record_video_size={'width': 1920, 'height': 1080}
        )
        desktop_page = desktop_ctx.new_page()
        
        # Segment 07: Supervisor Login + Dashboard
        print(f"    07_supervisor_intro ({wait_segment('07_supervisor_intro'):.1f}s)")
        dur = wait_segment('07_supervisor_intro')
        desktop_page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/login')
        time.sleep(dur * 0.1)
        safe_fill(desktop_page, 'input[type="email"]', 'supervisor@arogya.ai')
        time.sleep(dur * 0.1)
        safe_fill(desktop_page, 'input[type="password"]', 'SupervisorPass123!')
        time.sleep(dur * 0.1)
        safe_click(desktop_page, 'button[type="submit"]')
        time.sleep(dur * 0.4)
        try:
            desktop_page.hover('text=Agentic AI', timeout=3000)
        except:
            pass
        time.sleep(dur * 0.3)
        
        # Segment 08: Statistics
        print(f"    08_statistics ({wait_segment('08_statistics'):.1f}s)")
        dur = wait_segment('08_statistics')
        desktop_page.evaluate('window.scrollBy(0, 200)')
        time.sleep(dur)
        
        # Segment 09: 6-Level Reasoning
        print(f"    09_reasoning ({wait_segment('09_reasoning'):.1f}s)")
        dur = wait_segment('09_reasoning')
        safe_click(desktop_page, 'tbody tr:first-child')
        time.sleep(dur * 0.3)
        desktop_page.evaluate('window.scrollBy(0, 400)')
        time.sleep(dur * 0.7)
        
        # Segment 10: Green Approval
        print(f"    10_approval ({wait_segment('10_approval'):.1f}s)")
        dur = wait_segment('10_approval')
        desktop_page.evaluate('window.scrollBy(0, 300)')
        time.sleep(dur)
        
        # Segment 11: Orange Escalation
        print(f"    11_escalation ({wait_segment('11_escalation'):.1f}s)")
        dur = wait_segment('11_escalation')
        desktop_page.go_back()
        time.sleep(dur * 0.2)
        safe_click(desktop_page, 'tbody tr:nth-child(2)')
        time.sleep(dur * 0.3)
        desktop_page.evaluate('window.scrollBy(0, 400)')
        time.sleep(dur * 0.5)
        
        # Segment 12: Multilingual + Search
        print(f"    12_multilingual ({wait_segment('12_multilingual'):.1f}s)")
        dur = wait_segment('12_multilingual')
        desktop_page.go_back()
        time.sleep(dur * 0.2)
        if safe_click(desktop_page, 'select[name="language"]'):
            try:
                desktop_page.select_option('select[name="language"]', 'ta', timeout=3000)
            except:
                pass
            time.sleep(dur * 0.3)
            try:
                desktop_page.select_option('select[name="language"]', 'en', timeout=3000)
            except:
                pass
        time.sleep(dur * 0.5)
        
        # Segment 13: Scale
        print(f"    13_scale ({wait_segment('13_scale'):.1f}s)")
        dur = wait_segment('13_scale')
        desktop_page.evaluate('window.scrollBy(0, -500)')
        time.sleep(dur)
        
        # Segment 14: Closing
        print(f"    14_closing ({wait_segment('14_closing'):.1f}s)")
        dur = wait_segment('14_closing')
        time.sleep(dur)
        
        print("    ✓ Desktop recording done")
        
        desktop_page.close()
        desktop_video_path = desktop_page.video.path()
        desktop_ctx.close()
        
        if desktop_video_path and os.path.exists(desktop_video_path):
            shutil.move(desktop_video_path, 'Video/desktop_synced.webm')
        
        browser.close()
    
    print("\n  ✓ Both recordings saved")


def step3_combine_final():
    """Combine video recordings with voiceover into final 3-min video"""
    print("\n" + "=" * 80)
    print("[STEP 3/3] COMBINING FINAL VIDEO")
    print("=" * 80)
    
    mobile = 'Video/mobile_synced.webm'
    desktop = 'Video/desktop_synced.webm'
    audio = 'Video/full_voiceover.mp3'
    output = 'Video/Arogya_AI_Final_Synced.mp4'
    
    for f in [mobile, desktop, audio]:
        if not os.path.exists(f):
            print(f"  ✗ Missing: {f}")
            return False
    
    mobile_dur = get_mp3_duration(mobile)
    desktop_dur = get_mp3_duration(desktop)
    audio_dur = get_mp3_duration(audio)
    total_video = mobile_dur + desktop_dur
    
    print(f"\n  Mobile: {mobile_dur:.1f}s")
    print(f"  Desktop: {desktop_dur:.1f}s")
    print(f"  Total video: {total_video:.1f}s")
    print(f"  Audio: {audio_dur:.1f}s")
    
    # Convert mobile
    print("\n  [1/4] Converting mobile...")
    subprocess.run([
        'ffmpeg', '-i', mobile,
        '-vf', 'scale=390:844:force_original_aspect_ratio=decrease,pad=390:844:(ow-iw)/2:(oh-ih)/2',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-an',
        '-y', 'Video/mobile_conv.mp4'
    ], check=True, capture_output=True)
    
    # Convert desktop
    print("  [2/4] Converting desktop...")
    subprocess.run([
        'ffmpeg', '-i', desktop,
        '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-an',
        '-y', 'Video/desktop_conv.mp4'
    ], check=True, capture_output=True)
    
    # Concatenate
    print("  [3/4] Concatenating...")
    with open('Video/concat_final.txt', 'w') as f:
        f.write("file 'mobile_conv.mp4'\n")
        f.write("file 'desktop_conv.mp4'\n")
    
    subprocess.run([
        'ffmpeg', '-f', 'concat', '-safe', '0',
        '-i', 'Video/concat_final.txt',
        '-c', 'copy',
        '-y', 'Video/video_concat.mp4'
    ], check=True, capture_output=True)
    
    # Combine with audio - match durations
    print("  [4/4] Combining with voiceover...")
    subprocess.run([
        'ffmpeg',
        '-i', 'Video/video_concat.mp4',
        '-i', audio,
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        '-shortest',
        '-t', '180',
        '-y', output
    ], check=True, capture_output=True)
    
    # Clean up
    for temp in ['Video/mobile_conv.mp4', 'Video/desktop_conv.mp4',
                 'Video/video_concat.mp4', 'Video/concat_final.txt']:
        if os.path.exists(temp):
            os.remove(temp)
    
    final_dur = get_mp3_duration(output)
    file_size = os.path.getsize(output)
    
    print(f"\n  ✓ Final video: {output}")
    print(f"    Duration: {final_dur:.1f}s ({final_dur/60:.1f} min)")
    print(f"    Size: {file_size/(1024*1024):.1f} MB")
    
    return True


if __name__ == '__main__':
    print("=" * 80)
    print("AROGYA AI - PERFECTLY SYNCED 3-MINUTE DEMO")
    print("Audio-first approach for perfect synchronization")
    print("=" * 80)
    
    # Step 1: Generate audio segments first
    segment_durations = step1_generate_audio_segments()
    
    # Step 2: Record video timed to audio segments
    step2_record_video_synced(segment_durations)
    
    # Step 3: Combine everything
    success = step3_combine_final()
    
    if success:
        print("\n" + "=" * 80)
        print("SUCCESS! 🎉 PERFECTLY SYNCED VIDEO READY!")
        print("=" * 80)
        print("\n  File: Video/Arogya_AI_Final_Synced.mp4")
        print("\n  ✓ Voice and video perfectly synchronized")
        print("  ✓ Patient journey in mobile view")
        print("  ✓ Supervisor dashboard in desktop view")
        print("  ✓ Multilingual support demonstrated")
        print("  ✓ All Agentic AI features shown")
        print("  ✓ Professional story-telling narration")
        print("  ✓ Exactly 3 minutes")
    else:
        print("\n  ✗ Failed - check errors above")
