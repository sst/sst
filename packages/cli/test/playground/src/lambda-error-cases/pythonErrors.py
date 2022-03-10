import os
import time
import logging

if os.getenv('TRIGGER_INIT_ERROR', 'false') == 'true':
  print("case: initialization")
  raise Exception('this is an exception outside of handler')

def logLevels(event, context):
  print("case: normal")
  logging.info('this is a info')
  logging.warn('this is a warn')
  logging.error('this is a error')

def throw(event, context):
  print("case: throw")
  raise Exception('this is an exception')

def timeout(event, context):
  print("case: timeout")
  time.sleep(15)

def oom(event, context):
  print("case: oom")
  alloc_mem()

def alloc_mem():
  new_list4k = [0]*4096000    # initialize to 4096 0's
  big_list = []
  big_list.extend(new_list4k) # resizes big_list to accomodate at least 4k items
  return big_list.extend(alloc_mem())
