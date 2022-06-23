---
title: Sneaky File Descriptors in Popen()
subtitle: Always be closing
tagline: Always be closing
date: 2022-06-09
---

In the last month I had three projects due dates converge, on top of full-time work I accidentally signed up for and on top of standard full-time uni commitments.  Of these projects, [Minecraftle](https://minecraftle.zachmanson.com) was the most fun to put together, but [rake](https://github.com/pavo-etc/rake) was the most *educational*.  I'd never worked with sockets or TCP protocols before so this project was out of my comfort zone, and barring a few hiccups, we managed to build decent (and fragile) client and server programs.

The assignment required the design and implementation of protocol to enable distributed compilation of files and remote command execution across multiple servers (r(emote) + (m)ake = rake).  We needed to write a server program, and two client programs (one in C, the other in Python).  Between Beej's guide and the coursework, we fumbled our way to working prototypes, able to pass files, messages, and any other arbitrary data between our clients and servers.  The commands and files needing to be passed to servers were defined in a `Rakefile`, a strictly written parody of makefiles.

It was extremely satisfying to see the programs work, with files being sent from my partner's machine to servers at my house and back again in perfect-ish synchronicity.  Just for our own gratification we tested it by compiling larger and larger C programs, which the servers handled by creating subprocesses to execute in parallel threads.

```py
# Executes a given command
def run_command(cmd_str, execution_path):
    if cmd_str.startswith('remote-'):
        cmd_str = cmd_str[7:]

    if verbose: print("\tExecuting", cmd_str)
    proc = subprocess.Popen(cmd_str, cwd=execution_path, shell = True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    global n_active_procs
    n_active_procs+=1
    return proc
```

(Obviously this is a security nightmare, we literally open the servers to execute arbitrary commands without any santising or checks.  Please don't abuse.  Or better yet, don't use.)

In our satisfaction-based testing, we noticed that the server would regularly crash when it received its 1010th to 1020th connection from the clients.

```bash
Got connection 1012 from ('192.168.0.28', 56193)
	<-- cost-query
	--> cost 2
Got connection 1013 from ('192.168.0.28', 56194)
	<-- 2 1 cc -c func3.c
	<-- filename: func3.c
	<-- file (size 39)
	Saved file /tmp/rs-5c1c832d-a18f-4189-b039-f6335af03aeb/func3.c
	Saved 1 files to dir: /tmp/rs-5c1c832d-a18f-4189-b039-f6335af03aeb
	Executing cc -c func3.c
Traceback (most recent call last):
  File "rakeserver.py", line 151, in <module>
    receive_command(received_data, connection)
  File "rakeserver.py", line 88, in receive_command
    proc = run_command(cmd_str, execution_path)
  File "rakeserver.py", line 41, in run_command
    proc = subprocess.Popen(cmd_str, cwd=execution_path, shell = True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
  File "/usr/lib/python3.8/subprocess.py", line 858, in __init__
    self._execute_child(args, executable, preexec_fn, close_fds,
  File "/usr/lib/python3.8/subprocess.py", line 1605, in _execute_child
    errpipe_read, errpipe_write = os.pipe()
OSError: [Errno 24] Too many open files
```

1020 is suspiciously close to 1024, which immediately seemed like a red flag.  Though `select()` wasn't being called in the server, I was aware of the existence of limitations around socket/file descriptors over 1024 in some functions.

As far as I could tell all sockets were being closed properly by the server and all files that were opened were closed.  Adding some debug output revealed that the sockets were leaking in pairs‽

It was also noteworthy that many file descriptors *were* being reused by the server, so clearly some of them were being handled properly.

After hours of StackOverflow and dubious imitations of it, I resigned myself to hoping the markers never ran the server for long enough to get 1010 connections and notice the leak.  The rest of the assignment was functional and we'd get a good mark regardless of this bug.  The only thing at risk was my pride.

We fixed up the other remaining bugs, generally cleaned up formatting and completed our write-up, readied for submission the next day.  On the morning it was due, I hoped fresh eyes would help me squash this tantalisingly simple bug.

Fresh eyes prevailed and I found the leak.  To allow the stdout and stderr to be passed back to the client, we set the proc object to capture the command's outputs with the arguments `stdout=subprocess.PIPE, stderr=subprocess.PIPE`.  These were retrieved later in the program:

```py
msg2 = str(proc.stdout.read().decode("utf-8")) 
msg3 = str(proc.stderr.read().decode("utf-8"))
```

`read()` should have been the giveaway.  Unbeknownst to me, `subprocess.Popen()` opens files to capture the outputs, which I was never closing.  

```py
msg2 = str(proc.stdout.read().decode("utf-8")) 
msg3 = str(proc.stderr.read().decode("utf-8"))

proc.stdout.close()
proc.stderr.close()
```

Leak plugged!

---

**Update 2022-06-20:**

Just learnt about popen() in C, now I feel really stupid.