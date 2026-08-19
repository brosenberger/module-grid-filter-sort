<?php
/**
 * Copyright (C) 2026 Benjamin Rosenberger <bensch.rosenberger@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @copyright 2026 Benjamin Rosenberger
 * @author bensch.rosenberger@gmail.com
 * @license MIT
 * @link https://brocode.at
 */
declare(strict_types=1);

namespace BroCode\GridFilterSort\Block\Adminhtml;

use BroCode\GridFilterSort\Model\Config\WhitelistResolver;
use Magento\Backend\Block\Template;
use Magento\Backend\Block\Template\Context;
use Magento\Framework\Serialize\Serializer\Json;

/**
 * Publishes the filter whitelist to the admin page so the ui-select mixin can read it.
 *
 * The block renders on every admin page, because a grid filter can appear on any of
 * them. It emits nothing at all when the whitelist is empty, which is the default.
 */
class PageConfig extends Template
{
    /**
     * @var string
     */
    protected $_template = 'BroCode_GridFilterSort::page_config.phtml';

    /**
     * @var WhitelistResolver
     */
    private $whitelistResolver;

    /**
     * @var Json
     */
    private $json;

    public function __construct(
        Context $context,
        WhitelistResolver $whitelistResolver,
        Json $json,
        array $data = []
    ) {
        parent::__construct($context, $data);
        $this->whitelistResolver = $whitelistResolver;
        $this->json = $json;
    }

    /**
     * Whether there is anything worth rendering.
     */
    public function hasWhitelist(): bool
    {
        return $this->whitelistResolver->getWhitelist() !== [];
    }

    /**
     * The whitelist as a JSON array, ready to embed in the page.
     */
    public function getWhitelistJson(): string
    {
        return (string)$this->json->serialize($this->whitelistResolver->getWhitelist());
    }
}
