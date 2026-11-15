import hashlib
import io
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import prepare_qwen3_4b_research as prep


class Response(io.BytesIO):
    def __init__(self,content,status,headers):
        super().__init__(content)
        self.status=status
        self.headers=headers
        self.url='https://cas-bridge.xethub.hf.co/verified-fixture'


class Transport:
    def __init__(self,response):
        self.response=response
        self.request=None
    def open(self,request,timeout):
        self.request=request
        return self.response


class PreparationContracts(unittest.TestCase):
    def metadata(self):
        siblings=[]
        for name,(size,kind,digest) in prep.FILES.items():
            row={'rfilename':name,'size':size}
            if kind=='sha256': row['lfs']={'sha256':digest}
            else: row['blobId']=digest
            siblings.append(row)
        return {'id':prep.MODEL,'sha':prep.REVISION,'cardData':{'license':'apache-2.0'},'siblings':siblings}

    def test_model_revision_license_and_all_file_hashes_pinned(self):
        prep.validate_metadata(self.metadata())
        for field,value in [('id','other/model'),('sha','main'),('cardData',{'license':'unknown'})]:
            metadata=self.metadata()
            metadata[field]=value
            with self.assertRaises(ValueError): prep.validate_metadata(metadata)
        metadata=self.metadata()
        metadata['siblings'][0]['blobId']='0'*40
        with self.assertRaises(ValueError): prep.validate_metadata(metadata)

    def test_only_official_https_endpoints(self):
        for url in ('https://huggingface.co/Qwen/test','https://cas-bridge.xethub.hf.co/test'):
            self.assertEqual(prep.approved_url(url),url)
        for url in ('http://huggingface.co/test','https://huggingface.co.evil.test/test','https://evil.test/test','https://user:secret@huggingface.co/test','https://huggingface.co:8000/test'):
            with self.assertRaises(ValueError): prep.approved_url(url)

    def test_resume_range_must_match_entire_remaining_file(self):
        prep.response_range(206,{'Content-Range':'bytes 4-9/10','Content-Length':'6'},4,10)
        for status,headers in [(200,{}),(206,{'Content-Range':'bytes 0-9/10'}),(206,{'Content-Range':'bytes 4-8/10'}),(206,{'Content-Range':'bytes 4-9/11'}),(206,{'Content-Range':'bytes 4-9/10','Content-Length':'7'})]:
            with self.assertRaises(ValueError): prep.response_range(status,headers,4,10)

    def test_verified_resume_atomic_promotion(self):
        content=b'abcdefghij'
        spec=(len(content),'sha256',hashlib.sha256(content).hexdigest())
        with tempfile.TemporaryDirectory() as name, patch.dict(prep.FILES,{'test.safetensors':spec}):
            root=Path(name)
            (root/'test.safetensors.partial').write_bytes(content[:4])
            transport=Transport(Response(content[4:],206,{'Content-Range':'bytes 4-9/10','Content-Length':'6'}))
            prep.download_file(root,'test.safetensors',transport)
            self.assertEqual(transport.request.get_header('Range'),'bytes=4-')
            self.assertEqual((root/'test.safetensors').read_bytes(),content)
            self.assertFalse((root/'test.safetensors.partial').exists())

    def test_corrupt_final_and_oversized_partial_preserved(self):
        content=b'abc'
        spec=(3,'sha256',hashlib.sha256(content).hexdigest())
        with tempfile.TemporaryDirectory() as name, patch.dict(prep.FILES,{'test.safetensors':spec}):
            root=Path(name)
            target=root/'test.safetensors'
            target.write_bytes(b'xyz')
            with self.assertRaises(ValueError): prep.download_file(root,'test.safetensors',Transport(None))
            self.assertEqual(target.read_bytes(),b'xyz')
            partial=root/'other.safetensors.partial'
            partial.write_bytes(b'abcd')
            with patch.dict(prep.FILES,{'other.safetensors':spec}):
                with self.assertRaises(ValueError): prep.download_file(root,'other.safetensors',Transport(None))
            self.assertEqual(partial.read_bytes(),b'abcd')

    def test_git_object_and_content_hashes_distinguished(self):
        content=b'abc'
        with tempfile.TemporaryDirectory() as name:
            path=Path(name)/'fixture'
            path.write_bytes(content)
            git_hash=hashlib.sha1(b'blob 3\0'+content).hexdigest()
            self.assertTrue(prep.valid_file(path,(3,'git-sha1',git_hash)))
            self.assertTrue(prep.valid_file(path,(3,'sha256',hashlib.sha256(content).hexdigest())))
            self.assertFalse(prep.valid_file(path,(3,'sha256','0'*64)))

    def test_output_cannot_escape_research_workspace(self):
        with self.assertRaises(ValueError): prep.output_path(Path.cwd()/'outside-model')
        with self.assertRaises(ValueError): prep.output_path(prep.RESEARCH_ROOT/'..'/'..'/'escaped')
        self.assertEqual(prep.output_path(prep.DEFAULT_OUTPUT),prep.DEFAULT_OUTPUT)


if __name__=='__main__': unittest.main()
